const PEOPLE_CHAIN_RPC = 'wss://polkadot-people-rpc.polkadot.io';

// Cache for identity lookups to avoid repeated RPC calls
const identityCache = new Map<string, { display: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface IdentityInfo {
  display: string;
  hasIdentity: boolean;
}

/**
 * Helper function to decode identity data bytes to string
 */
function decodeIdentityData(data: any): string {
  if (!data) return 'anon';

  // PAPI returns structured data with type variants
  // For identity data, it's typically { type: 'Raw0' to 'Raw32', value: FixedSizeBinary }

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
        console.warn('[identity] Error calling asText():', e);
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
        console.warn('[identity] Error calling asBytes():', e);
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
  console.warn('[identity] Unknown identity data structure:', JSON.stringify(data, null, 2));

  return 'anon';
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
 * Note: This function must be called server-side only
 * @param accountId - The Polkadot account address
 * @returns Identity information including display name and whether identity exists
 */
export async function getIdentity(accountId: string): Promise<IdentityInfo> {
  // Check cache first
  const cached = identityCache.get(accountId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { display: cached.display, hasIdentity: cached.display !== 'anon' };
  }

  // Dynamic imports to avoid bundling Node.js-specific code in the client
  const { createClient } = await import("polkadot-api");
  const { getWsProvider } = await import("polkadot-api/ws-provider/node");
  const { people } = await import("@polkadot-api/descriptors");

  let client: ReturnType<typeof createClient> | null = null;

  try {
    // Create client and typed API
    client = createClient(getWsProvider(PEOPLE_CHAIN_RPC));
    const api = client.getTypedApi(people);

    // Query identity
    const identityData = await api.query.Identity.IdentityOf.getValue(accountId);

    // Check if identity exists
    if (!identityData) {
      identityCache.set(accountId, { display: 'anon', timestamp: Date.now() });
      return { display: 'anon', hasIdentity: false };
    }

    // Extract display name
    const displayField = identityData.info.display;

    // Log the actual structure for debugging
    console.log('[identity] Display field type:', typeof displayField);
    console.log('[identity] Display field:', displayField);

    let displayName = decodeIdentityData(displayField);

    // Clean up the display name (remove extra quotes, whitespace)
    displayName = displayName.trim().replace(/^["']|["']$/g, '');

    // If after cleaning we get empty string, use "anon"
    if (!displayName) {
      displayName = 'anon';
    }

    // Cache result
    identityCache.set(accountId, { display: displayName, timestamp: Date.now() });

    return { display: displayName, hasIdentity: true };
  } catch (error) {
    console.error('[identity] Error fetching identity for', accountId, error);
    if (error instanceof Error) {
      console.error('[identity] Error stack:', error.stack);
    }
    // Return "anon" on error but don't cache it
    return { display: 'anon', hasIdentity: false };
  } finally {
    if (client) {
      client.destroy();
    }
  }
}

/**
 * Batch fetch identities for multiple accounts
 * More efficient than calling getIdentity multiple times
 * Note: This function must be called server-side only
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

  // Dynamic imports to avoid bundling Node.js-specific code in the client
  const { createClient } = await import("polkadot-api");
  const { getWsProvider } = await import("polkadot-api/ws-provider/node");
  const { people } = await import("@polkadot-api/descriptors");

  let client: ReturnType<typeof createClient> | null = null;

  try {
    client = createClient(getWsProvider(PEOPLE_CHAIN_RPC));
    const api = client.getTypedApi(people);

    // Query all identities in parallel
    const identityPromises = uncachedIds.map(accountId =>
      api.query.Identity.IdentityOf.getValue(accountId)
    );

    const identities = await Promise.all(identityPromises);

    // Process results
    for (let i = 0; i < uncachedIds.length; i++) {
      const accountId = uncachedIds[i];
      const identityData = identities[i];

      let displayName = 'anon';

      if (identityData) {
        try {
          const displayField = identityData.info.display;
          console.log('[identity] Batch display field for', accountId, ':', displayField);
          displayName = decodeIdentityData(displayField);
          displayName = displayName.trim().replace(/^["']|["']$/g, '');

          if (!displayName) {
            displayName = 'anon';
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
    if (client) {
      client.destroy();
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
