#!/usr/bin/env tsx
/**
 * Check the proxy account balance
 * Shows current balance and warns if it's getting low
 */

import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { dot } from "@polkadot-api/descriptors"
import { cryptoWaitReady, sr25519PairFromSeed, encodeAddress } from '@polkadot/util-crypto';
import { mnemonicToMiniSecret, mnemonicValidate } from '@polkadot/util-crypto';
import { stringToU8a } from '@polkadot/util';

/**
 * Helper to create a keypair from seed phrase or derivation path
 */
async function createKeypairFromSeed(seed: string) {
  await cryptoWaitReady();

  // Check if it's a mnemonic
  if (mnemonicValidate(seed)) {
    const miniSecret = mnemonicToMiniSecret(seed);
    return sr25519PairFromSeed(miniSecret);
  }

  // Otherwise treat as derivation path (e.g., //Alice)
  const seedU8a = stringToU8a(seed.padEnd(32, ' '));
  return sr25519PairFromSeed(seedU8a.slice(0, 32));
}

async function checkProxyBalance() {
  const PROXY_SEED = process.env.PROXY_SEED;
  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'wss://polkadot-asset-hub-rpc.polkadot.io';

  if (!PROXY_SEED) {
    console.error('❌ PROXY_SEED not set in environment variables');
    process.exit(1);
  }

  console.log('🔍 Checking proxy account balance...\n');
  console.log(`RPC Endpoint: ${RPC_ENDPOINT}`);

  let client: ReturnType<typeof createClient> | null = null;

  try {
    // Connect to Asset Hub
    client = createClient(getWsProvider(RPC_ENDPOINT));
    const api = client.getTypedApi(dot);

    // Create keypair from seed
    const pair = await createKeypairFromSeed(PROXY_SEED);
    const address = encodeAddress(pair.publicKey, 0); // Polkadot prefix

    console.log(`Proxy Address: ${address}\n`);

    // Get account balance
    const accountInfo = await api.query.System.Account.getValue(address);
    const freeBalance = accountInfo.data.free;
    const reservedBalance = accountInfo.data.reserved;
    const DECIMALS = 10; // Asset Hub uses 10 decimals

    const freeDOT = Number(freeBalance) / Math.pow(10, DECIMALS);
    const reservedDOT = Number(reservedBalance) / Math.pow(10, DECIMALS);
    const totalDOT = freeDOT + reservedDOT;

    console.log('==========================================');
    console.log('💰 Balance Information');
    console.log('==========================================');
    console.log(`Free Balance:     ${freeDOT.toFixed(4)} DOT`);
    console.log(`Reserved Balance: ${reservedDOT.toFixed(4)} DOT`);
    console.log(`Total Balance:    ${totalDOT.toFixed(4)} DOT`);
    console.log('==========================================\n');

    // Check thresholds
    const MIN_BALANCE_DOT = 0.5;
    const LOW_BALANCE_WARNING_DOT = 2;

    if (freeDOT < MIN_BALANCE_DOT) {
      console.log('❌ CRITICAL: Balance too low to mint!');
      console.log(`   Minimum required: ${MIN_BALANCE_DOT} DOT`);
      console.log(`   Current balance:  ${freeDOT.toFixed(4)} DOT`);
      console.log(`   Please top up immediately!\n`);
      process.exit(1);
    } else if (freeDOT < LOW_BALANCE_WARNING_DOT) {
      console.log('⚠️  WARNING: Balance is getting low');
      console.log(`   Warning threshold: ${LOW_BALANCE_WARNING_DOT} DOT`);
      console.log(`   Current balance:   ${freeDOT.toFixed(4)} DOT`);
      console.log(`   Consider topping up soon\n`);
    } else {
      console.log('✅ Balance is sufficient for minting\n');
    }

    // Estimate how many mints are possible
    // Rough estimate: ~0.02 DOT per mint (includes transaction fees, metadata storage, etc)
    const ESTIMATED_COST_PER_MINT = 0.02;
    const estimatedMints = Math.floor(freeDOT / ESTIMATED_COST_PER_MINT);

    console.log('📊 Estimates:');
    console.log(`   Estimated cost per mint: ~${ESTIMATED_COST_PER_MINT} DOT`);
    console.log(`   Possible mints remaining: ~${estimatedMints}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error checking balance:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.destroy();
    }
  }
}

checkProxyBalance();
