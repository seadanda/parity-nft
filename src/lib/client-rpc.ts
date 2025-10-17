/**
 * Client-side RPC calls
 *
 * These run directly in the browser using WebSocket connections
 * NO VERCEL FUNCTION CALLS = NO COST!
 *
 * Use these instead of calling /api/identity or /api/check-balance
 */

import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/web';
import { people, dot } from '@polkadot-api/descriptors';

// Cache for identity lookups (5 minute TTL)
const identityCache = new Map<string, { display: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Use environment variables for RPC endpoints (client-side uses NEXT_PUBLIC_ prefix)
const PEOPLE_CHAIN_RPC = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_PEOPLE_CHAIN_RPC || 'wss://polkadot-people-rpc.polkadot.io')
  : 'wss://polkadot-people-rpc.polkadot.io';

const ASSET_HUB_RPC = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'wss://polkadot-asset-hub-rpc.polkadot.io')
  : 'wss://polkadot-asset-hub-rpc.polkadot.io';

const MIN_BALANCE_PLANCK = BigInt('1000000000'); // 0.1 DOT

/**
 * Decode identity data field
 */
function decodeIdentityData(data: any): string {
  if (!data) return 'anon';

  // Handle None type
  if (data.type === 'None') {
    return 'anon';
  }

  // Handle Raw types (Raw0, Raw1, ... Raw32)
  if (data.type && data.type.startsWith('Raw') && data.value) {
    const value = data.value;

    // PAPI's FixedSizeBinary has helper methods
    if (typeof value.asText === 'function') {
      try {
        const text = value.asText();
        return text || 'anon';
      } catch (e) {
        console.warn('[client-rpc] Error calling asText():', e);
      }
    }

    // Try asBytes() if asText() didn't work
    if (typeof value.asBytes === 'function') {
      try {
        const bytes = value.asBytes();
        if (bytes instanceof Uint8Array) {
          return new TextDecoder().decode(bytes);
        }
      } catch (e) {
        console.warn('[client-rpc] Error calling asBytes():', e);
      }
    }

    // If value is directly a Uint8Array
    if (value instanceof Uint8Array) {
      return new TextDecoder().decode(value);
    }

    // If value is already a string
    if (typeof value === 'string') {
      return value;
    }
  }

  // Handle if data is directly a Uint8Array
  if (data instanceof Uint8Array) {
    return new TextDecoder().decode(data);
  }

  // Handle if data is a string
  if (typeof data === 'string') {
    return data;
  }

  // Debug: log the actual structure if we can't decode it
  console.warn('[client-rpc] Unknown identity data structure:', JSON.stringify(data, null, 2));

  return 'anon';
}

//
// IDENTITY FUNCTIONS
//

/**
 * Get identity display name for a single address
 */
export async function getIdentity(address: string): Promise<{ display: string; hasIdentity: boolean }> {
  // Check cache first
  const cached = identityCache.get(address);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { display: cached.display, hasIdentity: cached.display !== 'anon' };
  }

  let client: ReturnType<typeof createClient> | null = null;

  try {
    const provider = getWsProvider(PEOPLE_CHAIN_RPC);
    client = createClient(provider);
    const api = client.getTypedApi(people);

    const identityData = await api.query.Identity.IdentityOf.getValue(address);

    let displayName = 'anon';
    let hasIdentity = false;

    if (identityData) {
      try {
        const displayField = identityData.info.display;
        displayName = decodeIdentityData(displayField);
        displayName = displayName.trim().replace(/^["']|["']$/g, '');

        if (displayName) {
          hasIdentity = true;
        } else {
          displayName = 'anon';
        }
      } catch (e) {
        console.warn('[client-rpc] Error parsing identity:', e);
      }
    }

    identityCache.set(address, { display: displayName, timestamp: Date.now() });
    return { display: displayName, hasIdentity };
  } catch (error) {
    console.error('[client-rpc] Error fetching identity:', error);
    return { display: 'anon', hasIdentity: false };
  } finally {
    if (client) {
      client.destroy();
    }
  }
}

/**
 * Get identities for multiple addresses
 * Runs client-side with parallel queries
 */
export async function getIdentitiesBatch(addresses: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Check cache
  const uncachedAddresses: string[] = [];
  for (const address of addresses) {
    const cached = identityCache.get(address);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      results.set(address, cached.display);
    } else {
      uncachedAddresses.push(address);
    }
  }

  if (uncachedAddresses.length === 0) {
    return results;
  }

  let client: ReturnType<typeof createClient> | null = null;

  try {
    const provider = getWsProvider(PEOPLE_CHAIN_RPC);
    client = createClient(provider);
    const api = client.getTypedApi(people);

    const identityPromises = uncachedAddresses.map(address =>
      api.query.Identity.IdentityOf.getValue(address)
        .then(data => ({ address, data }))
        .catch(() => ({ address, data: null }))
    );

    const identities = await Promise.all(identityPromises);

    for (const { address, data } of identities) {
      let displayName = 'anon';

      if (data) {
        try {
          const displayField = data.info.display;
          displayName = decodeIdentityData(displayField);
          displayName = displayName.trim().replace(/^["']|["']$/g, '');
          if (!displayName) displayName = 'anon';
        } catch (e) {
          // Ignore
        }
      }

      identityCache.set(address, { display: displayName, timestamp: Date.now() });
      results.set(address, displayName);
    }

    return results;
  } catch (error) {
    console.error('[client-rpc] Batch fetch error:', error);
    for (const address of uncachedAddresses) {
      if (!results.has(address)) {
        results.set(address, 'anon');
      }
    }
    return results;
  } finally {
    if (client) {
      client.destroy();
    }
  }
}

//
// BALANCE FUNCTIONS
//

/**
 * Check account balance (>= 0.1 DOT)
 */
export async function checkAccountBalance(
  address: string
): Promise<{ hasBalance: boolean; balance: string; balancePlanck: bigint }> {
  let client: ReturnType<typeof createClient> | null = null;

  try {
    const provider = getWsProvider(ASSET_HUB_RPC);
    client = createClient(provider);
    const api = client.getTypedApi(dot);

    const accountInfo = await api.query.System.Account.getValue(address);
    const free = accountInfo.data.free;
    const balanceDOT = Number(free) / 1e10;

    return {
      hasBalance: free >= MIN_BALANCE_PLANCK,
      balance: balanceDOT.toFixed(4),
      balancePlanck: free
    };
  } catch (error) {
    console.error('[client-rpc] Error checking balance:', error);
    throw new Error('Failed to check account balance');
  } finally {
    if (client) {
      client.destroy();
    }
  }
}

/**
 * Clear identity cache
 */
export function clearIdentityCache() {
  identityCache.clear();
}
