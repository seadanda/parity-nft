import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import crypto from 'crypto';
import { uploadJson, uploadFile } from 'pinata';
import { isEmailWhitelisted, hasEmailMinted, recordMint } from './db';
import { calculateTierFromHash } from './tier-calculator';
import fs from 'fs';
import path from 'path';

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

  // Log proxy account balance for monitoring
  const DECIMALS = 10; // Asset Hub uses 10 decimals for DOT
  try {
    const accountInfo = await api.query.system.account(charlie.address);
    const balance = (accountInfo as unknown as { data: { free: { toBigInt: () => bigint } } }).data;
    const freeBalance = balance.free.toBigInt();
    const balanceDOT = Number(freeBalance) / Math.pow(10, DECIMALS);
    console.log(`[mint] Proxy account ${charlie.address} balance: ${balanceDOT.toFixed(4)} DOT`);
  } catch (error) {
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

  // Upload tier image to IPFS
  const tierImageFilename = `${tierInfo.name.toLowerCase().replace(/ /g, '-')}.png`;
  const tierImagePath = path.join(process.cwd(), 'public', 'tier-images', tierImageFilename);

  let imageIpfsUrl = '';
  try {
    if (fs.existsSync(tierImagePath)) {
      const imageFile = new File(
        [fs.readFileSync(tierImagePath)],
        tierImageFilename,
        { type: 'image/png' }
      );

      const pinataConfig = { pinataJwt: PINATA_JWT };
      const groupIdEnv = process.env.PINATA_GROUP_ID;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const groupId = groupIdEnv && uuidRegex.test(groupIdEnv) ? groupIdEnv : undefined;

      const imageUpload = await uploadFile(
        pinataConfig,
        imageFile,
        'public',
        {
          metadata: {
            name: `parity-10y-${tierInfo.name.toLowerCase()}-preview.png`
          },
          ...(groupId && { groupId })
        }
      );

      imageIpfsUrl = `ipfs://${imageUpload.cid}`;
      console.log('[mint] Image uploaded:', imageIpfsUrl);
    }
  } catch (imageError) {
    console.error('[mint] Failed to upload tier image:', imageError);
    // Continue without image - animation_url is primary content
  }

  // Create metadata
  const animationUrl = `ipfs://QmcPqw25RfDdqUvSgVC4sxvXsy43dA2sCRSDAyKx1UPTqa/index.html?hash=${hash}`;

  interface NFTMetadata {
    [key: string]: unknown;
    name: string;
    description: string;
    animation_url: string;
    image: string;
    attributes: Array<{ trait_type: string; value: string }>;
  }

  const jsonMetadata: NFTMetadata = {
    name: `10 Years of Parity ${tierInfo.name}`,
    description: "Celebrating Parity's 10 year anniversary with a generative NFT collection",
    animation_url: animationUrl,
    image: imageIpfsUrl, // IPFS URL for tier preview image
    attributes: [
      { trait_type: "ID", value: nextId.toString() },
      { trait_type: "Hash", value: hash },
      { trait_type: "Tier", value: tierInfo.name },
      { trait_type: "Rarity", value: tierInfo.rarity }
    ]
  };

  // Upload metadata to Pinata
  const pinataConfig = { pinataJwt: PINATA_JWT };

  // Use the parity-nft group ID from environment (must be a valid UUID)
  const groupIdEnv = process.env.PINATA_GROUP_ID;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const groupId = groupIdEnv && uuidRegex.test(groupIdEnv) ? groupIdEnv : undefined;

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

  console.log('[mint] Metadata uploaded:', upload.cid);

  if (!upload || !upload.cid) {
    await api.disconnect();
    throw new Error('Pinata upload failed: no CID returned');
  }

  const metadata = `ipfs://${upload.cid}`;

  // Build NFT operations
  const mintCall = api.tx.nfts.forceMint(COLLECTION_ID, nextId, recipientAddress, null);
  const setMetadataCall = api.tx.nfts.setMetadata(COLLECTION_ID, nextId, metadata);
  const lockTransferCall = api.tx.nfts.lockItemTransfer(COLLECTION_ID, nextId);

  // Note: setAttribute calls require broader proxy permissions than AssetManager provides
  // Attributes are included in the JSON metadata instead

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
  console.log('[mint] Submitting transaction...');
  const result = await new Promise<MintResult>((resolve, reject) => {
    proxyCall.signAndSend(charlie, (result) => {
      const { status, events, dispatchError } = result;

      if (status.isInBlock) {
        console.log('[mint] Transaction included in block:', status.asInBlock.toHex());

        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            console.error(`[mint] Error: ${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            console.error('[mint] Error:', dispatchError.toString());
            reject(new Error(dispatchError.toString()));
          }
          return;
        }

        const mintSuccess = events.some(({ event }) => api.events.nfts.Issued?.is(event));

        // Check for ProxyExecuted and extract any errors
        let proxyError: string | null = null;
        const proxySuccess = events.some(({ event }) => {
          if (api.events.proxy.ProxyExecuted?.is(event)) {
            const [result] = event.data;
            if (result && typeof result === 'object' && 'isOk' in result && result.isOk) {
              return true;
            }
            // Extract error from ProxyExecuted
            if (result && typeof result === 'object' && 'isErr' in result) {
              const err = (result as any).asErr;
              if (err && err.isModule) {
                const decoded = api.registry.findMetaError(err.asModule);
                proxyError = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              } else {
                proxyError = err.toString();
              }
            }
          }
          return false;
        });

        if (mintSuccess && proxySuccess) {
          console.log('[mint] ✅ NFT minted successfully - Collection:', COLLECTION_ID, 'Item:', nextId);
          resolve({
            success: true,
            hash,
            nftId: nextId,
            tier: tierInfo.name,
            rarity: tierInfo.rarity,
            glassColor: tierInfo.glassColor,
            glowColor: tierInfo.glowColor,
            imageUrl: imageIpfsUrl,
            metadataUrl: metadata,
            transactionHash: status.asInBlock.toHex(),
            collectionId: COLLECTION_ID
          });
        } else {
          if (proxyError) {
            console.error('[mint] Proxy execution error:', proxyError);
            reject(new Error(`Proxy execution failed: ${proxyError}`));
          } else {
            reject(new Error('Mint transaction failed'));
          }
        }
      }
    }).catch(reject);
  });

  // Record mint in database after transaction completes
  // Note: Email is NOT stored in mint_records for privacy
  try {
    await recordMint(
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
