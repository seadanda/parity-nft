import { ApiPromise, WsProvider } from '@polkadot/api';

const PEOPLE_CHAIN_RPC = 'wss://polkadot-people-rpc.polkadot.io';

// Cache for identity lookups to avoid repeated RPC calls
const identityCache = new Map<string, { display: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface IdentityInfo {
  display: string;
  hasIdentity: boolean;
}

/**
 * Fetches the identity display name for a Polkadot account from the People chain
 * @param accountId - The Polkadot account address
 * @returns The display name or "anon" if no identity is set
 */
export async function getIdentityDisplayName(accountId: string): Promise<string> {
  const identity = await getIdentity(accountId);
  return identity.display;
}

/**
 * Fetches full identity information for a Polkadot account from the People chain
 * @param accountId - The Polkadot account address
 * @returns Identity information including display name and whether identity exists
 */
export async function getIdentity(accountId: string): Promise<IdentityInfo> {
  // Check cache first
  const cached = identityCache.get(accountId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { display: cached.display, hasIdentity: cached.display !== 'anon' };
  }

  let api: ApiPromise | null = null;

  try {
    const provider = new WsProvider(PEOPLE_CHAIN_RPC);
    api = await ApiPromise.create({ provider });

    // Query identity.identityOf(accountId)
    const identityOption = await api.query.identity.identityOf(accountId);

    // Check if identity exists
    if (identityOption.isEmpty) {
      // No identity set, cache and return "anon"
      identityCache.set(accountId, { display: 'anon', timestamp: Date.now() });
      return { display: 'anon', hasIdentity: false };
    }

    // Extract the identity data
    const identity = identityOption.unwrap();

    // Access the info.display field
    // The display field is a Data type that can be Raw, None, or other variants
    const info = (identity as any).info;
    const displayData = info.display;

    let displayName = 'anon';

    // Check if display is set (not None)
    if (displayData && !displayData.isNone) {
      // Extract the raw bytes
      const displayRaw = displayData.isRaw ? displayData.asRaw : displayData;

      // Convert to string
      if (displayRaw && displayRaw.toUtf8) {
        displayName = displayRaw.toUtf8();
      } else if (displayRaw && displayRaw.toHuman) {
        displayName = String(displayRaw.toHuman());
      } else {
        displayName = String(displayRaw);
      }

      // Clean up the display name (remove extra quotes, whitespace)
      displayName = displayName.trim().replace(/^["']|["']$/g, '');
    }

    // Cache the result
    identityCache.set(accountId, { display: displayName, timestamp: Date.now() });

    return { display: displayName, hasIdentity: true };
  } catch (error) {
    console.error('[identity] Error fetching identity for', accountId, error);
    // Return "anon" on error but don't cache it
    return { display: 'anon', hasIdentity: false };
  } finally {
    if (api) {
      await api.disconnect();
    }
  }
}

/**
 * Batch fetch identities for multiple accounts
 * More efficient than calling getIdentity multiple times
 * @param accountIds - Array of Polkadot account addresses
 * @returns Map of accountId to display name
 */
export async function getIdentitiesBatch(accountIds: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Check cache first
  const uncachedIds: string[] = [];
  for (const accountId of accountIds) {
    const cached = identityCache.get(accountId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      results.set(accountId, cached.display);
    } else {
      uncachedIds.push(accountId);
    }
  }

  // If all were cached, return early
  if (uncachedIds.length === 0) {
    return results;
  }

  let api: ApiPromise | null = null;

  try {
    const provider = new WsProvider(PEOPLE_CHAIN_RPC);
    api = await ApiPromise.create({ provider });

    // Query all identities in parallel
    const identityPromises = uncachedIds.map(accountId =>
      api!.query.identity.identityOf(accountId)
    );

    const identities = await Promise.all(identityPromises);

    // Process results
    for (let i = 0; i < uncachedIds.length; i++) {
      const accountId = uncachedIds[i];
      const identityOption = identities[i];

      let displayName = 'anon';

      if (!identityOption.isEmpty) {
        try {
          const identity = identityOption.unwrap();
          const info = (identity as any).info;
          const displayData = info.display;

          if (displayData && !displayData.isNone) {
            const displayRaw = displayData.isRaw ? displayData.asRaw : displayData;

            if (displayRaw && displayRaw.toUtf8) {
              displayName = displayRaw.toUtf8();
            } else if (displayRaw && displayRaw.toHuman) {
              displayName = String(displayRaw.toHuman());
            } else {
              displayName = String(displayRaw);
            }

            displayName = displayName.trim().replace(/^["']|["']$/g, '');
          }
        } catch (error) {
          console.error('[identity] Error parsing identity for', accountId, error);
        }
      }

      // Cache and store result
      identityCache.set(accountId, { display: displayName, timestamp: Date.now() });
      results.set(accountId, displayName);
    }
  } catch (error) {
    console.error('[identity] Error fetching batch identities:', error);
    // Fill in remaining with "anon"
    for (const accountId of uncachedIds) {
      if (!results.has(accountId)) {
        results.set(accountId, 'anon');
      }
    }
  } finally {
    if (api) {
      await api.disconnect();
    }
  }

  return results;
}

/**
 * Clear the identity cache (useful for testing or manual refresh)
 */
export function clearIdentityCache(): void {
  identityCache.clear();
}
