import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import crypto from 'crypto';
import { PinataSDK, uploadJson } from 'pinata';
import { isEmailWhitelisted, hasEmailMinted, recordMint } from './db';

// Tier definitions matching the viewer
const TIERS = [
  { name: 'Graphite', weight: 20, rarity: 'Common', glassColor: '#1a1a1a', glowColor: '#ffffff' },
  { name: 'Bronze', weight: 12, rarity: 'Common', glassColor: '#cd7f32', glowColor: '#ff9944' },
  { name: 'Silver', weight: 8, rarity: 'Uncommon', glassColor: '#c0c0c0', glowColor: '#ffffff' },
  { name: 'Copper', weight: 8, rarity: 'Uncommon', glassColor: '#b87333', glowColor: '#ff6633' },
  { name: 'Emerald', weight: 5, rarity: 'Rare', glassColor: '#50c878', glowColor: '#00ff00' },
  { name: 'Sapphire', weight: 3, rarity: 'Very Rare', glassColor: '#0f52ba', glowColor: '#0080ff' },
  { name: 'Green', weight: 3, rarity: 'Very Rare', glassColor: '#00ff00', glowColor: '#00ff00' },
  { name: 'Ruby', weight: 2, rarity: 'Ultra Rare', glassColor: '#e0115f', glowColor: '#ff0040' },
  { name: 'Gold', weight: 1.5, rarity: 'Ultra Rare', glassColor: '#ffd700', glowColor: '#ffff00' },
  { name: 'Magenta', weight: 0.5, rarity: 'Legendary', glassColor: '#ff00ff', glowColor: '#ff00a8' },
  { name: 'Obelisk', weight: 0.5, rarity: 'Legendary', glassColor: '#4b0082', glowColor: '#9400d3' },
  { name: 'Obelisk Ultra', weight: 0.5, rarity: 'Legendary', glassColor: '#ff1493', glowColor: '#ff69b4' }
];

// Seeded random number generator (Mulberry32)
class SeededRandom {
  seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Convert Koda hash to seed - MUST match staging/sketch.js EXACTLY
function hashToSeed(hash: string): number {
  // KodaDot's standard algorithm: sum 5 chunks of 12 chars each
  // NOTE: Uses the original hash string INCLUDING "0x" prefix
  let seed = 0;
  for (let hl = 0; hl < 60; hl = hl + 12) {
    seed += parseInt(hash.substring(hl, hl + 12), 16);
  }
  return seed;
}

// Calculate tier from hash
function calculateTierFromHash(hash: string) {
  const seed = hashToSeed(hash);
  const rng = new SeededRandom(seed);
  const totalWeight = TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  const roll = rng.next() * totalWeight;
  let accumulator = 0;

  for (const tier of TIERS) {
    accumulator += tier.weight;
    if (roll <= accumulator) {
      return tier;
    }
  }

  return TIERS[0];
}

interface MintConfig {
  COLLECTION_ID?: number;
  ASSET_HUB_WS?: string;
  PROXY_SEED?: string;
  COLLECTION_OWNER_ADDRESS?: string;
  PINATA_JWT?: string;
  GENERATE_IMAGE?: boolean;
}

interface MintResult {
  success: boolean;
  hash: string;
  nftId: number;
  tier: string;
  rarity: string;
  glassColor: string;
  glowColor: string;
  imageUrl: string;
  metadataUrl: string;
  transactionHash: string;
  collectionId: number;
}

/**
 * Mint an NFT via proxy
 */
export async function mintNFT(email: string, recipientAddress: string, config: MintConfig = {}): Promise<MintResult> {
  const {
    COLLECTION_ID = parseInt(process.env.COLLECTION_ID || '662'),
    ASSET_HUB_WS = process.env.RPC_ENDPOINT || 'wss://polkadot-asset-hub-rpc.polkadot.io',
    PROXY_SEED = process.env.PROXY_SEED,
    COLLECTION_OWNER_ADDRESS = process.env.COLLECTION_OWNER_ADDRESS,
    PINATA_JWT = process.env.PINATA_JWT,
    GENERATE_IMAGE = process.env.GENERATE_IMAGE !== 'false'
  } = config;

  // Validate COLLECTION_ID
  if (isNaN(COLLECTION_ID) || COLLECTION_ID <= 0) {
    throw new Error('Invalid COLLECTION_ID configuration');
  }

  // Validate whitelist
  if (!isEmailWhitelisted(email)) {
    throw new Error('Email not whitelisted');
  }

  if (hasEmailMinted(email)) {
    throw new Error('Email already minted');
  }

  // Validate configuration
  if (!PROXY_SEED) {
    throw new Error('PROXY_SEED not configured');
  }

  if (!COLLECTION_OWNER_ADDRESS) {
    throw new Error('COLLECTION_OWNER_ADDRESS not configured');
  }

  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT not configured');
  }

  // Connect to Asset Hub
  const api = await ApiPromise.create({
    provider: new WsProvider(ASSET_HUB_WS)
  });

  const keyring = new Keyring({ type: 'sr25519' });
  const charlie = keyring.addFromUri(PROXY_SEED);
  const bobAddress = COLLECTION_OWNER_ADDRESS;

  // Validate recipient address
  try {
    api.createType('AccountId', recipientAddress);
  } catch (error) {
    await api.disconnect();
    throw new Error('Invalid recipient address');
  }

  // Verify proxy relationship
  const [proxies] = await api.query.proxy.proxies(bobAddress);

  // Normalize addresses to AccountId for comparison (handles different SS58 formats)
  const charlieAccountId = api.createType('AccountId', charlie.address);

  const charlieProxy = proxies.find((p: any) => {
    const delegateAccountId = api.createType('AccountId', p.delegate.toString());
    return delegateAccountId.eq(charlieAccountId) &&
      (p.proxyType.toString() === 'AssetManager' || p.proxyType.toString() === 'Any');
  });

  if (!charlieProxy) {
    await api.disconnect();
    throw new Error('Proxy not configured correctly');
  }

  // Get next NFT ID first (needed for deterministic hash)
  const items = await api.query.nfts.item.entries(COLLECTION_ID);
  let nextId = 0;
  if (items.length > 0) {
    const existingIds = items.map(([key]) => {
      const id = (key.args[1] as any).toNumber ? (key.args[1] as any).toNumber() : parseInt((key.args[1] as any).toString());
      return id;
    });
    nextId = Math.max(...existingIds) + 1;
  }

  // Generate DETERMINISTIC hash from email + nftId + collection
  const hashInput = `${email.toLowerCase()}:${COLLECTION_ID}:${nextId}`;
  const hash = '0x' + crypto.createHash('sha256').update(hashInput).digest('hex');
  const tierInfo = calculateTierFromHash(hash);

  // Generate preview image (optional)
  let imageUrl: string | undefined;
  if (GENERATE_IMAGE) {
    try {
      console.log('🎨 Generating preview image...');
      const { generateAndUploadImage } = await import('./image-generator');
      imageUrl = await generateAndUploadImage(hash, nextId);
      console.log('   ✅ Preview image uploaded:', imageUrl);
    } catch (error) {
      console.error('❌ Image generation failed:', error);
      console.warn('   Continuing without preview image...');
    }
  }

  // Create metadata
  const animationUrl = `ipfs://QmcPqw25RfDdqUvSgVC4sxvXsy43dA2sCRSDAyKx1UPTqa/index.html?hash=${hash}`;

  const jsonMetadata: any = {
    name: `10 years of Parity ${tierInfo.name}`,
    description: "Celebrating Parity's 10 year anniversary with a generative NFT collection",
    animation_url: animationUrl,
    attributes: [
      { trait_type: "ID", value: nextId.toString() },
      { trait_type: "Hash", value: hash },
      { trait_type: "Tier", value: tierInfo.name },
      { trait_type: "Rarity", value: tierInfo.rarity }
    ]
  };

  // Only include image if we have one
  if (imageUrl) {
    jsonMetadata.image = imageUrl;
  }

  // Upload metadata to Pinata
  const pinataConfig = { pinataJwt: PINATA_JWT };

  // Use the parity-nft group ID from environment (must be a valid UUID)
  const groupIdEnv = process.env.PINATA_GROUP_ID;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const groupId = groupIdEnv && uuidRegex.test(groupIdEnv) ? groupIdEnv : undefined;

  if (groupId) {
    console.log('Using Pinata group ID:', groupId);
  } else {
    console.warn('PINATA_GROUP_ID not set or invalid, uploading without group');
  }

  console.log('Uploading metadata to Pinata...');
  const upload = await uploadJson(
    pinataConfig,
    jsonMetadata,
    'public',
    {
      metadata: {
        name: `parity-10y-metadata-${nextId}.json`
      },
      ...(groupId && { groupId })
    }
  );

  console.log('Upload result:', upload);

  if (!upload || !upload.cid) {
    await api.disconnect();
    throw new Error('Pinata upload failed: no CID returned');
  }

  const metadata = `ipfs://${upload.cid}`;

  // Build NFT operations
  const mintCall = api.tx.nfts.forceMint(COLLECTION_ID, nextId, recipientAddress, null);
  const setMetadataCall = api.tx.nfts.setMetadata(COLLECTION_ID, nextId, metadata);
  const lockTransferCall = api.tx.nfts.lockItemTransfer(COLLECTION_ID, nextId);

  // Batch and wrap in proxy call
  const batchCall = api.tx.utility.batchAll([
    mintCall,
    setMetadataCall,
    lockTransferCall
  ]);

  const proxyCall = api.tx.proxy.proxy(
    bobAddress,
    null,
    batchCall
  );

  // Execute transaction
  const result = await new Promise<MintResult>((resolve, reject) => {
    proxyCall.signAndSend(charlie, ({ status, events, dispatchError }: any) => {
      if (status.isInBlock) {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
          return;
        }

        const mintSuccess = events.some(({ event }: any) => api.events.nfts.Issued?.is(event));
        const proxySuccess = events.some(({ event }: any) => {
          if (api.events.proxy.ProxyExecuted?.is(event)) {
            const [result] = event.data;
            return result.isOk;
          }
          return false;
        });

        if (mintSuccess && proxySuccess) {
          // Record mint in database
          try {
            await recordMint(
              email,
              recipientAddress,
              COLLECTION_ID,
              nextId,
              hash,
              tierInfo.name,
              tierInfo.rarity,
              status.asInBlock.toHex(),
              metadata,
              imageUrl
            );
          } catch (dbError) {
            console.error('Failed to record mint in database:', dbError);
          }

          resolve({
            success: true,
            hash,
            nftId: nextId,
            tier: tierInfo.name,
            rarity: tierInfo.rarity,
            glassColor: tierInfo.glassColor,
            glowColor: tierInfo.glowColor,
            imageUrl,
            metadataUrl: metadata,
            transactionHash: status.asInBlock.toHex(),
            collectionId: COLLECTION_ID
          });
        } else {
          reject(new Error('Mint transaction failed'));
        }
      }
    }).catch(reject);
  });

  await api.disconnect();
  return result;
}

export { TIERS, calculateTierFromHash };
