/**
 * Development Script: Mint NFTs for All Whitelisted Users
 *
 * This script simulates the complete minting process for all whitelisted users
 * WITHOUT uploading to IPFS. Uses dummy IPFS links for metadata.
 *
 * SAFETY: Only runs if NODE_ENV !== 'production'
 *
 * Usage:
 *   npm run dev:mint-all
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { getAllWhitelist } from '../src/lib/db';
import { createClient, Binary } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/node";
import { dot } from "@polkadot-api/descriptors";
import { getPolkadotSigner } from "polkadot-api/signer";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import { DEV_PHRASE, entropyToMiniSecret, mnemonicToEntropy, validateMnemonic } from "@polkadot-labs/hdkd-helpers";
import { calculateTierFromHash } from '../src/lib/tier-calculator';
import crypto from 'crypto';

// SAFETY CHECK: Prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: This script cannot run in production!');
  process.exit(1);
}

if (!process.env.SKIP_IPFS_CHECK) {
  console.error('❌ ERROR: This script bypasses IPFS. Set SKIP_IPFS_CHECK=true to acknowledge.');
  process.exit(1);
}

interface MintResult {
  email: string;
  nftId: number;
  hash: string;
  tier: string;
  rarity: string;
  success: boolean;
  error?: string;
}

// Generate deterministic wallet address from email (for testing)
function generateTestAddress(email: string): string {
  const hash = crypto.createHash('sha256').update(email).digest();
  const entropy = hash.slice(0, 32);
  const miniSecret = entropyToMiniSecret(entropy);
  const derive = sr25519CreateDerive(miniSecret);
  const keypair = derive('');

  // Convert public key to SS58 address (Polkadot prefix 0)
  const ss58Prefix = 0;
  const publicKey = keypair.publicKey;

  // Simple SS58 encoding (using polkadot-api helpers)
  const { ss58Address } = require('@polkadot-labs/hdkd-helpers');
  return ss58Address(publicKey, ss58Prefix);
}

async function devMintAll() {
  console.log('🔧 Development Mint Script - Minting NFTs for all whitelisted users\n');
  console.log('⚠️  SAFETY CHECKS:');
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - IPFS Upload: DISABLED (using dummy links)`);
  console.log(`   - Collection ID: ${process.env.COLLECTION_ID || '669'}\n`);

  const COLLECTION_ID = parseInt(process.env.COLLECTION_ID || '669');
  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'wss://polkadot-asset-hub-rpc.polkadot.io';
  const PROXY_SEED = process.env.PROXY_SEED;
  const COLLECTION_OWNER_ADDRESS = process.env.COLLECTION_OWNER_ADDRESS;

  if (!PROXY_SEED || !COLLECTION_OWNER_ADDRESS) {
    console.error('❌ ERROR: PROXY_SEED and COLLECTION_OWNER_ADDRESS must be set');
    process.exit(1);
  }

  // Get all whitelisted users who haven't minted
  console.log('📋 Fetching whitelist...');
  const whitelist = await getAllWhitelist();
  const unmintedUsers = whitelist.filter((user: any) => !user.has_minted);

  console.log(`   Total whitelisted: ${whitelist.length}`);
  console.log(`   Already minted: ${whitelist.length - unmintedUsers.length}`);
  console.log(`   To mint: ${unmintedUsers.length}\n`);

  if (unmintedUsers.length === 0) {
    console.log('✅ All whitelisted users have already minted!');
    return;
  }

  // Confirm before proceeding
  console.log('⚠️  This will mint NFTs on-chain for all unminted users.');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Connect to chain
  console.log('🔗 Connecting to Asset Hub...');
  const provider = getWsProvider(RPC_ENDPOINT);
  const client = createClient(provider);
  const api = client.getTypedApi(dot);

  // Create signer from proxy seed
  const entropy = mnemonicToEntropy(validateMnemonic(PROXY_SEED) ? PROXY_SEED : DEV_PHRASE);
  const miniSecret = entropyToMiniSecret(entropy);
  const derive = sr25519CreateDerive(miniSecret);
  const keypair = validateMnemonic(PROXY_SEED) ? derive('') : derive(PROXY_SEED);
  const assetManagerSigner = getPolkadotSigner(
    keypair.publicKey,
    'Sr25519',
    keypair.sign
  );

  // Get current collection size to determine next NFT ID
  console.log('📊 Querying collection state...');
  const collectionDetails = await api.query.Nfts.Collection.getValue(COLLECTION_ID);

  if (!collectionDetails) {
    console.error('❌ ERROR: Collection not found');
    client.destroy();
    process.exit(1);
  }

  let nextId = collectionDetails.items;
  console.log(`   Current collection size: ${nextId}`);
  console.log(`   Starting NFT ID: ${nextId}\n`);

  const results: MintResult[] = [];

  // Mint for each user
  for (const user of unmintedUsers) {
    const email = user.email as string;
    console.log(`\n🎨 Minting for: ${email}`);

    try {
      // Generate deterministic recipient address from email
      const recipientAddress = generateTestAddress(email);
      console.log(`   Recipient: ${recipientAddress.slice(0, 10)}...${recipientAddress.slice(-8)}`);

      // Generate hash from email (deterministic for dev)
      const hashBuffer = crypto.createHash('sha256').update(email + nextId.toString()).digest();
      const hash = '0x' + hashBuffer.toString('hex');
      console.log(`   Hash: ${hash.slice(0, 10)}...`);

      // Calculate tier from hash
      const tierInfo = calculateTierFromHash(hash);
      console.log(`   Tier: ${tierInfo.name} (${tierInfo.rarity})`);

      // Dummy IPFS URLs (not uploaded)
      const dummyImageIpfs = `ipfs://QmDUMMY${nextId.toString().padStart(6, '0')}/image.png`;
      const dummyMetadataIpfs = `ipfs://QmDUMMY${nextId.toString().padStart(6, '0')}/metadata.json`;

      // Build mint transaction
      const mintCall = api.tx.Nfts.force_mint({
        collection: COLLECTION_ID,
        item: nextId,
        mint_to: { type: "Id", value: recipientAddress },
        item_config: BigInt(0)
      });

      const setMetadataCall = api.tx.Nfts.set_metadata({
        collection: COLLECTION_ID,
        item: nextId,
        data: Binary.fromText(dummyMetadataIpfs)
      });

      const lockTransferCall = api.tx.Nfts.lock_item_transfer({
        collection: COLLECTION_ID,
        item: nextId
      });

      // Batch mint operations
      const mintBatch = api.tx.Utility.batch_all({
        calls: [
          mintCall.decodedCall,
          setMetadataCall.decodedCall,
          lockTransferCall.decodedCall
        ]
      });

      // Wrap in proxy call (AssetManager)
      const mintProxyCall = api.tx.Proxy.proxy({
        real: { type: "Id", value: COLLECTION_OWNER_ADDRESS },
        force_proxy_type: { type: "AssetManager", value: undefined },
        call: mintBatch.decodedCall
      });

      // Create attribute setting calls
      const setHashAttribute = api.tx.Nfts.set_attribute({
        collection: COLLECTION_ID,
        maybe_item: nextId,
        namespace: { type: "CollectionOwner", value: undefined },
        key: Binary.fromText("hash"),
        value: Binary.fromText(hash)
      });

      const setTierAttribute = api.tx.Nfts.set_attribute({
        collection: COLLECTION_ID,
        maybe_item: nextId,
        namespace: { type: "CollectionOwner", value: undefined },
        key: Binary.fromText("tier"),
        value: Binary.fromText(tierInfo.name)
      });

      const setRarityAttribute = api.tx.Nfts.set_attribute({
        collection: COLLECTION_ID,
        maybe_item: nextId,
        namespace: { type: "CollectionOwner", value: undefined },
        key: Binary.fromText("rarity"),
        value: Binary.fromText(tierInfo.rarity)
      });

      // Batch attributes
      const attributeBatch = api.tx.Utility.batch_all({
        calls: [
          setHashAttribute.decodedCall,
          setTierAttribute.decodedCall,
          setRarityAttribute.decodedCall
        ]
      });

      // Wrap attributes in proxy call (AssetOwner)
      const attributeProxyCall = api.tx.Proxy.proxy({
        real: { type: "Id", value: COLLECTION_OWNER_ADDRESS },
        force_proxy_type: { type: "AssetOwner", value: undefined },
        call: attributeBatch.decodedCall
      });

      // Final batch of both proxy calls
      const finalBatch = api.tx.Utility.batch_all({
        calls: [
          mintProxyCall.decodedCall,
          attributeProxyCall.decodedCall
        ]
      });

      // Submit transaction
      console.log('   ⏳ Submitting transaction...');

      await new Promise<void>((resolve, reject) => {
        const subscription = finalBatch.signSubmitAndWatch(assetManagerSigner).subscribe({
          next: (event: any) => {
            if (event.type === 'finalized') {
              const blockHash = event.block.hash;
              const blockEvents = event.events;

              const failed = blockEvents.find((e: any) =>
                e.type === 'System' && e.value.type === 'ExtrinsicFailed'
              );

              if (failed) {
                subscription.unsubscribe();
                reject(new Error('Transaction failed'));
                return;
              }

              const issuedEvent = blockEvents.find((e: any) =>
                e.type === 'Nfts' && e.value.type === 'Issued'
              );

              if (issuedEvent) {
                console.log(`   ✅ Minted NFT #${nextId} in block ${blockHash}`);
                subscription.unsubscribe();
                resolve();
              }
            }
          },
          error: (err: any) => {
            subscription.unsubscribe();
            reject(err);
          }
        });
      });

      results.push({
        email,
        nftId: nextId,
        hash,
        tier: tierInfo.name,
        rarity: tierInfo.rarity,
        success: true
      });

      nextId++; // Increment for next mint

    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({
        email,
        nftId: nextId,
        hash: '',
        tier: '',
        rarity: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Small delay between mints to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Cleanup
  client.destroy();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MINTING SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (successful > 0) {
    console.log('Successful mints:');
    results.filter(r => r.success).forEach(r => {
      console.log(`  - ${r.email}: NFT #${r.nftId} (${r.tier})`);
    });
  }

  if (failed > 0) {
    console.log('\nFailed mints:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.email}: ${r.error}`);
    });
  }

  console.log('\n⚠️  NOTE: These NFTs were minted with dummy IPFS metadata.');
  console.log('   Database has_minted flags were NOT updated.');
  console.log('   Use this only for development/testing!\n');
}

// Run the script
devMintAll().catch(console.error);
