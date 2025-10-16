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

const PEOPLE_CHAIN_RPC = 'wss://polkadot-people-rpc.polkadot.io';
const POLKADOT_RPC = 'wss://polkadot-rpc.polkadot.io';
const MIN_BALANCE_PLANCK = BigInt('1000000000'); // 0.1 DOT

/**
 * Decode identity data field
 */
function decodeIdentityData(field: any): string {
  if (!field || !field.value) return '';

  if (field.type === 'Raw' && field.value) {
    if (typeof field.value === 'string') return field.value;
    if (field.value instanceof Uint8Array) {
      return new TextDecoder().decode(field.value);
    }
  }

  return String(field.value || '');
}

//
// IDENTITY FUNCTIONS
//

/**
 * Get identity display name for a single address
 * Runs in browser, no backend call!
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
 * Runs in browser, no backend call!
 */
export async function checkAccountBalance(
  address: string
): Promise<{ hasBalance: boolean; balance: string; balancePlanck: bigint }> {
  let client: ReturnType<typeof createClient> | null = null;

  try {
    const provider = getWsProvider(POLKADOT_RPC);
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
