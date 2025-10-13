#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import { mintNFT } from '../src/lib/mint';

const TEST_EMAIL = 'test@parity.io'; // Use an email that's whitelisted
const TEST_WALLET = '13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB'; // Replace with your test wallet

async function testMint() {
  console.log('🎨 Testing NFT Mint');
  console.log('========================================\n');
  console.log(`Email: ${TEST_EMAIL}`);
  console.log(`Wallet: ${TEST_WALLET}\n`);

  try {
    const result = await mintNFT(TEST_EMAIL, TEST_WALLET);

    console.log('========================================');
    console.log('✅ Mint successful!');
    console.log('========================================');
    console.log('NFT ID:', result.nftId);
    console.log('Hash:', result.hash);
    console.log('Tier:', result.tier);
    console.log('Rarity:', result.rarity);
    console.log('Glass Color:', result.glassColor);
    console.log('Glow Color:', result.glowColor);
    console.log('Transaction:', result.transactionHash);
    console.log('Metadata:', result.metadataUrl);
    console.log('Image:', result.imageUrl);
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Mint failed:', error);
    process.exit(1);
  }
}

testMint();
