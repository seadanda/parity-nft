import { createClient, Binary } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { dot } from "@polkadot-api/descriptors"
import { getPolkadotSigner } from "polkadot-api/signer"
import { sr25519CreateDerive } from "@polkadot-labs/hdkd"
import { DEV_PHRASE, entropyToMiniSecret, mnemonicToEntropy, validateMnemonic, sr25519, ss58Address } from "@polkadot-labs/hdkd-helpers"
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
 * Helper to create a keypair from seed phrase using PAPI's hdkd
 */
function createKeypairFromSeed(seed: string) {
  // Check if it's a mnemonic
  if (validateMnemonic(seed)) {
    const entropy = mnemonicToEntropy(seed);
    const miniSecret = entropyToMiniSecret(entropy);
    const derive = sr25519CreateDerive(miniSecret);
    // Return the root keypair (no derivation path)
    return derive("");
  }

  // Otherwise treat as derivation path (e.g., //Alice) from dev phrase
  const entropy = mnemonicToEntropy(DEV_PHRASE);
  const miniSecret = entropyToMiniSecret(entropy);
  const derive = sr25519CreateDerive(miniSecret);
  return derive(seed);
}

/**
 * Encode address from public key using PAPI's hdkd-helpers
 */
function encodeAddress(publicKey: Uint8Array): string {
  return ss58Address(publicKey, 0); // 0 = Polkadot prefix
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

  let client: ReturnType<typeof createClient> | null = null;

  try {
    // Connect to Asset Hub
    client = createClient(getWsProvider(ASSET_HUB_WS));
    const api = client.getTypedApi(dot);

    // Create keypair from seed for the asset manager proxy account
    const assetManagerKeyPair = createKeypairFromSeed(PROXY_SEED);

    // Create PAPI-compatible signer using native sr25519
    const assetManagerSigner = getPolkadotSigner(
      assetManagerKeyPair.publicKey,
      "Sr25519",
      assetManagerKeyPair.sign
    );

    // Get addresses
    const assetManagerAddress = encodeAddress(assetManagerKeyPair.publicKey);
    const collectionOwnerAddress = COLLECTION_OWNER_ADDRESS;

    // Verify proxy relationship
    const proxyResult = await api.query.Proxy.Proxies.getValue(collectionOwnerAddress);
    const proxies = proxyResult[0];

    // Find asset manager in proxy list
    const assetManagerProxy = proxies.find((p: any) => {
      // The delegate is an SS58 string in PAPI
      const delegateAddress = p.delegate;
      // PAPI uses proxy_type (snake_case) and it's an object with 'type' field
      const proxyTypeStr = p.proxy_type?.type || p.proxy_type;

      return delegateAddress === assetManagerAddress &&
        (proxyTypeStr === 'AssetManager' || proxyTypeStr === 'Any');
    });

    if (!assetManagerProxy) {
      throw new Error('Proxy not configured correctly');
    }

    // Log asset manager proxy account balance for monitoring
    const DECIMALS = 10; // Asset Hub uses 10 decimals for DOT
    try {
      const accountInfo = await api.query.System.Account.getValue(assetManagerAddress);
      const freeBalance = accountInfo.data.free;
      const balanceDOT = Number(freeBalance) / Math.pow(10, DECIMALS);
      console.log(`[mint] Asset manager proxy account ${assetManagerAddress} balance: ${balanceDOT.toFixed(4)} DOT`);
    } catch (error) {
      // If we can't check balance, log warning but continue
      console.warn('[mint] ⚠️  Could not check asset manager proxy account balance:', error);
    }

    // Get next NFT ID first (needed for deterministic hash)
    const items = await api.query.Nfts.Item.getEntries(COLLECTION_ID);
    let nextId = 0;
    if (items.length > 0) {
      const existingIds = items.map((item) => item.keyArgs[1]);
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
      throw new Error('Pinata upload failed: no CID returned');
    }

    const metadata = `ipfs://${upload.cid}`;

    // Build NFT operations using PAPI
    const mintCall = api.tx.Nfts.force_mint({
      collection: COLLECTION_ID,
      item: nextId,
      mint_to: { type: "Id", value: recipientAddress },
      item_config: BigInt(0)  // ItemConfig is a bigint for settings
    });

    const setMetadataCall = api.tx.Nfts.set_metadata({
      collection: COLLECTION_ID,
      item: nextId,
      data: Binary.fromText(metadata)  // Convert metadata string to Binary
    });

    const lockTransferCall = api.tx.Nfts.lock_item_transfer({
      collection: COLLECTION_ID,
      item: nextId
    });

    // Batch mint operations together
    const mintBatch = api.tx.Utility.batch_all({
      calls: [
        mintCall.decodedCall,
        setMetadataCall.decodedCall,
        lockTransferCall.decodedCall
      ]
    });

    // Wrap mint batch in proxy call - asset manager can force_mint
    const mintProxyCall = api.tx.Proxy.proxy({
      real: { type: "Id", value: collectionOwnerAddress },
      force_proxy_type: { type: "AssetManager", value: undefined },
      call: mintBatch.decodedCall
    });

    // Create set_attribute calls for hash, tier, and rarity
    const setHashAttribute = api.tx.Nfts.set_attribute({
      collection: COLLECTION_ID,
      maybe_item: nextId,
      namespace: { type: "ItemOwner", value: undefined },
      key: Binary.fromText("hash"),
      value: Binary.fromText(hash)
    });

    const setTierAttribute = api.tx.Nfts.set_attribute({
      collection: COLLECTION_ID,
      maybe_item: nextId,
      namespace: { type: "ItemOwner", value: undefined },
      key: Binary.fromText("tier"),
      value: Binary.fromText(tierInfo.name)
    });

    const setRarityAttribute = api.tx.Nfts.set_attribute({
      collection: COLLECTION_ID,
      maybe_item: nextId,
      namespace: { type: "ItemOwner", value: undefined },
      key: Binary.fromText("rarity"),
      value: Binary.fromText(tierInfo.rarity)
    });

    // Batch attribute setting calls together
    const attributeBatch = api.tx.Utility.batch_all({
      calls: [
        setHashAttribute.decodedCall,
        setTierAttribute.decodedCall,
        setRarityAttribute.decodedCall
      ]
    });

    // Wrap attribute batch in proxy call - asset owner can set attributes
    const attributeProxyCall = api.tx.Proxy.proxy({
      real: { type: "Id", value: collectionOwnerAddress },
      force_proxy_type: { type: "AssetOwner", value: undefined },
      call: attributeBatch.decodedCall
    });

    // Wrap both proxy calls in a final batch_all
    const finalBatch = api.tx.Utility.batch_all({
      calls: [
        mintProxyCall.decodedCall,
        attributeProxyCall.decodedCall
      ]
    });

    // Execute transaction with asset manager signer
    console.log('[mint] Submitting transaction...');

    const result = await new Promise<MintResult>((resolve, reject) => {
      try {
        const subscription = finalBatch.signSubmitAndWatch(assetManagerSigner).subscribe({
          next: (event: any) => {
          // Wait for finalization
          if (event.type === 'finalized') {
            const blockHash = event.block.hash;
            const blockEvents = event.events;

            console.log('[mint] Transaction finalized in block:', blockHash);

            // Check for errors - System.ExtrinsicFailed event
            const failed = blockEvents.find((e: any) =>
              e.type === 'System' && e.value.type === 'ExtrinsicFailed'
            );

            if (failed) {
              console.error('[mint] Transaction failed');
              subscription.unsubscribe();
              reject(new Error('Transaction failed'));
              return;
            }

            // Check for success events
            const issuedEvent = blockEvents.find((e: any) =>
              e.type === 'Nfts' && e.value.type === 'Issued'
            );

            const proxyExecutedEvent = blockEvents.find((e: any) =>
              e.type === 'Proxy' && e.value.type === 'ProxyExecuted'
            );

            if (issuedEvent && proxyExecutedEvent) {
              // ProxyExecuted event indicates proxy call was executed
              // If we got here and Issued event exists, the mint was successful
              console.log('[mint] ✅ NFT minted successfully - Collection:', COLLECTION_ID, 'Item:', nextId);
              subscription.unsubscribe();

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
                transactionHash: blockHash,
                collectionId: COLLECTION_ID
              });
            }
          }
        },
        error: (err: any) => {
          console.error('[mint] Transaction error:', err);
          reject(err);
        }
      });
      } catch (err: any) {
        console.error('[mint] Failed to create subscription:', err);
        reject(err);
      }
    });

    // Record mint in database after transaction completes
    // Note: Email is NOT stored in mint_records for privacy
    // but whitelist.has_minted is set to prevent double minting
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
      console.log(`[mint] Mint recorded for ${email}, has_minted flag set`);
    } catch (dbError) {
      console.error('Failed to record mint in database:', dbError);
      // Don't fail the mint if database recording fails
    }

    return result;
  } finally {
    if (client) {
      client.destroy();
    }
  }
}
