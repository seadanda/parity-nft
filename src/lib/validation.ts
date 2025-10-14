import { z } from 'zod';
import { ss58Decode, ss58Encode } from '@polkadot-labs/hdkd-helpers';

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
    // Decode the address to get the public key and prefix
    // ss58Decode returns a tuple: [payload: Uint8Array, prefix: number]
    const [payload, prefix] = ss58Decode(address);

    // Re-encode with Polkadot prefix (0) to verify format
    // This ensures the address is a valid Polkadot address (not Kusama, etc.)
    const reEncoded = ss58Encode(payload, 0);

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
 * Note: This function must be called server-side only
 * @param address - Polkadot address to check
 * @returns Object with hasBalance boolean and balance string
 */
export async function checkAccountBalance(
  address: string
): Promise<{ hasBalance: boolean; balance: string; balancePlanck: bigint }> {
  // Dynamic import to avoid bundling Node.js-specific code in the client
  const { createClient } = await import("polkadot-api");
  const { getWsProvider } = await import("polkadot-api/ws-provider/node");
  const { dot } = await import("@polkadot-api/descriptors");

  let client: ReturnType<typeof createClient> | null = null;

  try {
    // Use RPC endpoint from environment (Asset Hub for production)
    const rpcEndpoint = process.env.RPC_ENDPOINT;

    if (!rpcEndpoint) {
      throw new Error('RPC_ENDPOINT not configured');
    }

    console.log(`[checkAccountBalance] Using RPC: ${rpcEndpoint}`);

    // Create client and typed API
    client = createClient(getWsProvider(rpcEndpoint));
    const api = client.getTypedApi(dot);

    // Query account balance
    const accountInfo = await api.query.System.Account.getValue(address);

    // Extract free balance (already a bigint in PAPI)
    const free = accountInfo.data.free;

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
    if (client) {
      client.destroy();
    }
  }
}
