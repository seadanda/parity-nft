import { z } from 'zod';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { ApiPromise, WsProvider } from '@polkadot/api';

// Polkadot SS58 address validation
// SS58 addresses start with specific characters and have specific lengths
const SS58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/;

// Polkadot existential deposit is 1 DOT, but we check for 0.1 DOT minimum
const MIN_BALANCE_PLANCK = BigInt('1000000000'); // 0.1 DOT (10^9 planck = 0.1 DOT)

/**
 * Validates a Polkadot address (SS58 format with prefix 0)
 * Returns true if valid, false otherwise
 */
export function isValidPolkadotAddress(address: string): boolean {
  try {
    // Decode the address to get the public key
    const decoded = decodeAddress(address);

    // Re-encode with Polkadot prefix (0) to verify format
    // This ensures the address is a valid Polkadot address (not Kusama, etc.)
    const reEncoded = encodeAddress(decoded, 0);

    return address === reEncoded || address.startsWith('1'); // Polkadot addresses start with '1'
  } catch {
    return false;
  }
}

/**
 * Custom Zod validator for Polkadot addresses
 */
const polkadotAddressValidator = z.string()
  .min(1, 'Wallet address is required')
  .regex(SS58_REGEX, 'Please enter a valid SS58 address')
  .refine(
    (address) => isValidPolkadotAddress(address),
    'Please enter a valid Polkadot address (must use Polkadot network prefix)'
  );

export const mintFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  walletAddress: polkadotAddressValidator
});

export type MintFormData = z.infer<typeof mintFormSchema>;

/**
 * Checks if an account has sufficient balance (>= 0.1 DOT)
 * Uses the RPC endpoint from environment variables
 * @param address - Polkadot address to check
 * @returns Object with hasBalance boolean and balance string
 */
export async function checkAccountBalance(
  address: string
): Promise<{ hasBalance: boolean; balance: string; balancePlanck: bigint }> {
  let api: ApiPromise | null = null;

  try {
    // Use RPC endpoint from environment (Asset Hub for production)
    const rpcEndpoint = process.env.RPC_ENDPOINT || process.env.NEXT_PUBLIC_RPC_ENDPOINT;

    if (!rpcEndpoint) {
      throw new Error('RPC_ENDPOINT not configured');
    }

    console.log(`[checkAccountBalance] Using RPC: ${rpcEndpoint}`);

    const provider = new WsProvider(rpcEndpoint);
    api = await ApiPromise.create({ provider });

    // Query account balance
    const { data: balance } = await api.query.system.account(address);
    const free = balance.free.toBigInt();

    // Convert to DOT for display (10 decimals)
    const balanceDOT = Number(free) / 1e10;

    console.log(`[checkAccountBalance] Address ${address} has ${balanceDOT} DOT`);

    return {
      hasBalance: free >= MIN_BALANCE_PLANCK,
      balance: balanceDOT.toFixed(4),
      balancePlanck: free
    };
  } catch (error) {
    console.error('Error checking balance:', error);
    throw new Error('Failed to check account balance');
  } finally {
    if (api) {
      await api.disconnect();
    }
  }
}
