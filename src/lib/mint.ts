import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import crypto from 'crypto';
import { uploadJson } from 'pinata';
import { isEmailWhitelisted, hasEmailMinted, recordMint } from './db';

// Tier definitions - MUST match sketch-nobase64.js exactly for deterministic generation
const TIERS = [
  { name: 'Silver', weight: 8, rarity: 'Uncommon', glassColor: '#ffffff', glowColor: '#ffffff' },
  { name: 'Graphite', weight: 20, rarity: 'Common', glassColor: '#2b2f36', glowColor: '#7a8899' },
  { name: 'Bronze', weight: 12, rarity: 'Common', glassColor: '#cd7f32', glowColor: '#755b5b' },
  { name: 'Copper', weight: 8, rarity: 'Uncommon', glassColor: '#e81308', glowColor: '#be8a46' },
  { name: 'Emerald', weight: 5, rarity: 'Rare', glassColor: '#17a589', glowColor: '#66ffc8' },
  { name: 'Sapphire', weight: 3, rarity: 'Very Rare', glassColor: '#1f5fff', glowColor: '#66a3ff' },
  { name: 'Green', weight: 3, rarity: 'Very Rare', glassColor: '#005908', glowColor: '#ddffdd' },
  { name: 'Ruby', weight: 2, rarity: 'Ultra Rare', glassColor: '#dc5e85', glowColor: '#ff6f91' },
  { name: 'Gold', weight: 1.5, rarity: 'Ultra Rare', glassColor: '#ffd700', glowColor: '#ffe680' },
  { name: 'Magenta', weight: 0.5, rarity: 'Legendary', glassColor: '#ff00a8', glowColor: '#ff66cc' },
  { name: 'Obelisk', weight: 0.5, rarity: 'Legendary', glassColor: '#000000', glowColor: '#ffffff' },
  { name: 'Obelisk Ultra', weight: 0.5, rarity: 'Legendary', glassColor: '#000000', glowColor: '#ed1d64' }
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
    PINATA_JWT = process.env.PINATA_JWT
  } = config;

  // Validate COLLECTION_ID
  if (isNaN(COLLECTION_ID) || COLLECTION_ID <= 0) {
    throw new Error('Invalid COLLECTION_ID configuration');
  }

  // Validate whitelist
  if (!await isEmailWhitelisted(email)) {
    throw new Error('Email not whitelisted');
  }

  if (await hasEmailMinted(email)) {
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
  } catch {
    await api.disconnect();
    throw new Error('Invalid recipient address');
  }

  // Verify proxy relationship
  const proxyResult = await api.query.proxy.proxies(bobAddress);
  const proxies = (proxyResult as unknown as [unknown, unknown])[0];

  // Normalize addresses to AccountId for comparison (handles different SS58 formats)
  const charlieAccountId = api.createType('AccountId', charlie.address);

  interface ProxyDefinition {
    delegate: { toString: () => string };
    proxyType: { toString: () => string };
  }

  const charlieProxy = (proxies as unknown as ProxyDefinition[]).find((p) => {
    const delegateAccountId = api.createType('AccountId', p.delegate.toString());
    return delegateAccountId.eq(charlieAccountId) &&
      (p.proxyType.toString() === 'AssetManager' || p.proxyType.toString() === 'Any');
  });

  if (!charlieProxy) {
    await api.disconnect();
    throw new Error('Proxy not configured correctly');
  }

  // Check proxy account balance before minting
  const MIN_BALANCE_DOT = 0.5; // Minimum 0.5 DOT required
  const LOW_BALANCE_WARNING_DOT = 2; // Warn if below 2 DOT
  const DECIMALS = 10; // Asset Hub uses 10 decimals for DOT

  try {
    const accountInfo = await api.query.system.account(charlie.address);
    const balance = (accountInfo as unknown as { data: { free: { toBigInt: () => bigint } } }).data;
    const freeBalance = balance.free.toBigInt();
    const balanceDOT = Number(freeBalance) / Math.pow(10, DECIMALS);

    console.log(`[mint] Proxy account ${charlie.address} balance: ${balanceDOT.toFixed(4)} DOT`);

    // Check if balance is too low to mint
    if (balanceDOT < MIN_BALANCE_DOT) {
      await api.disconnect();
      console.error(`[mint] ❌ CRITICAL: Proxy account balance too low: ${balanceDOT.toFixed(4)} DOT (minimum: ${MIN_BALANCE_DOT} DOT)`);
      throw new Error(`INSUFFICIENT_PROXY_BALANCE: Proxy account has insufficient funds (${balanceDOT.toFixed(4)} DOT). Please top up the proxy account.`);
    }

    // Warn if balance is getting low (but still sufficient)
    if (balanceDOT < LOW_BALANCE_WARNING_DOT) {
      console.warn(`[mint] ⚠️  WARNING: Proxy account balance is low: ${balanceDOT.toFixed(4)} DOT. Consider topping up soon.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('INSUFFICIENT_PROXY_BALANCE')) {
      throw error; // Re-throw our custom error
    }
    // If we can't check balance, log warning but continue
    console.warn('[mint] ⚠️  Could not check proxy account balance:', error);
  }

  // Get next NFT ID first (needed for deterministic hash)
  const items = await api.query.nfts.item.entries(COLLECTION_ID);
  let nextId = 0;
  if (items.length > 0) {
    const existingIds = items.map(([key]) => {
      const itemId = key.args[1];
      const id = typeof itemId === 'object' && itemId && 'toNumber' in itemId
        ? (itemId as { toNumber: () => number }).toNumber()
        : parseInt(String(itemId));
      return id;
    });
    nextId = Math.max(...existingIds) + 1;
  }

  // Generate DETERMINISTIC hash from email + nftId + collection
  const hashInput = `${email.toLowerCase()}:${COLLECTION_ID}:${nextId}`;
  const hash = '0x' + crypto.createHash('sha256').update(hashInput).digest('hex');
  const tierInfo = calculateTierFromHash(hash);

  // Use static tier preview image (no Puppeteer needed)
  // Images are stored in /public/tier-images/{tier-name}.png
  const imageUrl = `/tier-images/${tierInfo.name.toLowerCase().replace(/ /g, '-')}.png`;

  // Create metadata
  const animationUrl = `ipfs://QmcPqw25RfDdqUvSgVC4sxvXsy43dA2sCRSDAyKx1UPTqa/index.html?hash=${hash}`;

  interface NFTMetadata {
    [key: string]: unknown;
    name: string;
    description: string;
    animation_url: string;
    image?: string;
    attributes: Array<{ trait_type: string; value: string }>;
  }

  const jsonMetadata: NFTMetadata = {
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
    proxyCall.signAndSend(charlie, (result) => {
      const { status, events, dispatchError } = result;
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

        const mintSuccess = events.some(({ event }) => api.events.nfts.Issued?.is(event));
        const proxySuccess = events.some(({ event }) => {
          if (api.events.proxy.ProxyExecuted?.is(event)) {
            const [result] = event.data;
            return result && typeof result === 'object' && 'isOk' in result && result.isOk;
          }
          return false;
        });

        if (mintSuccess && proxySuccess) {
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

  // Record mint in database after transaction completes
  try {
    await recordMint(
      email,
      recipientAddress,
      result.collectionId,
      result.nftId,
      result.hash,
      result.tier,
      result.rarity,
      result.transactionHash,
      result.metadataUrl,
      result.imageUrl
    );
  } catch (dbError) {
    console.error('Failed to record mint in database:', dbError);
    // Don't fail the mint if database recording fails
  }

  await api.disconnect();
  return result;
}

export { TIERS, calculateTierFromHash };
