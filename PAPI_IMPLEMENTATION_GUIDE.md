# PAPI Implementation Guide

## Overview

This guide provides detailed, code-level instructions for migrating each file from `@polkadot/api` to `polkadot-api` (PAPI).

---

## PAPI Key Concepts

### 1. Client Creation

**Old (pjs-api):**
```typescript
import { ApiPromise, WsProvider } from '@polkadot/api'

const provider = new WsProvider('wss://...')
const api = await ApiPromise.create({ provider })

// Use api
api.query.system.account(address)

// Cleanup
await api.disconnect()
```

**New (PAPI):**
```typescript
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { dot } from "@polkadot-api/descriptors"

const client = createClient(getWsProvider("wss://..."))
const api = client.getTypedApi(dot)

// Use api
await api.query.System.Account.getValue(address)

// Cleanup
client.destroy()
```

### 2. Queries

**Old:**
```typescript
const result = await api.query.system.account(address)
const balance = result.data.free.toBigInt()
```

**New:**
```typescript
const result = await api.query.System.Account.getValue(address)
const balance = result.data.free
```

### 3. Transactions

**Old:**
```typescript
const tx = api.tx.nfts.mint(collectionId, itemId, owner)
await tx.signAndSend(signer, (result) => {
  if (result.status.isInBlock) {
    console.log('In block')
  }
})
```

**New:**
```typescript
const tx = api.tx.Nfts.mint({
  collection: collectionId,
  item: itemId,
  mintTo: owner
})

await tx.signAndSubmit(signer)
// Or with callback
tx.signSubmitAndWatch(signer).subscribe((event) => {
  if (event.type === 'txBestBlocksState') {
    console.log('In block')
  }
})
```

### 4. Keyring / Signing

**Old:**
```typescript
import { Keyring } from '@polkadot/api'

const keyring = new Keyring({ type: 'sr25519' })
const account = keyring.addFromUri('//Alice')
```

**New:**
```typescript
import { sr25519CreateDerive } from '@polkadot-api/substrate-bindings'
import { getSigner } from 'polkadot-api/signer'

// For seed phrases
const derive = sr25519CreateDerive('//Alice')
const signer = getSigner(derive)

// Or import from @polkadot-api/signer for more options
```

---

## Migration Guide by File

### 1. Identity Lookups (`src/lib/identity.ts`)

#### Current Implementation Analysis

```typescript
// Current: Uses ApiPromise + WsProvider
const provider = new WsProvider(PEOPLE_CHAIN_RPC)
const api = await ApiPromise.create({ provider })

// Query
const identityOption = await api.query.identity.identityOf(accountId)

// Parse
if (identityOption.isEmpty) {
  return { display: 'anon', hasIdentity: false }
}
const identity = identityOption.unwrap()
const displayData = identity.info.display
const displayName = displayData.isRaw ? displayData.asRaw.toUtf8() : 'anon'
```

#### PAPI Implementation

**Step 1:** Install dependencies
```bash
npm install polkadot-api
npm install @polkadot-api/descriptors
```

**Step 2:** Generate chain descriptors
```bash
npx papi add people -w wss://polkadot-people-rpc.polkadot.io
```

This generates type definitions in `polkadot-api/descriptors/people.ts`

**Step 3:** Create new implementation

```typescript
// src/lib/identity-papi.ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { people } from "@polkadot-api/descriptors"

const PEOPLE_CHAIN_RPC = 'wss://polkadot-people-rpc.polkadot.io'

// Cache remains the same
const identityCache = new Map<string, { display: string; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000

interface IdentityInfo {
  display: string
  hasIdentity: boolean
}

export async function getIdentity(accountId: string): Promise<IdentityInfo> {
  // Check cache
  const cached = identityCache.get(accountId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { display: cached.display, hasIdentity: cached.display !== 'anon' }
  }

  let client: any = null

  try {
    // Create client and typed API
    client = createClient(getWsProvider(PEOPLE_CHAIN_RPC))
    const api = client.getTypedApi(people)

    // Query identity
    const identityData = await api.query.Identity.IdentityOf.getValue(accountId)

    // Check if identity exists
    if (!identityData) {
      identityCache.set(accountId, { display: 'anon', timestamp: Date.now() })
      return { display: 'anon', hasIdentity: false }
    }

    // Extract display name
    // Note: Type structure may differ - check generated types
    const displayField = identityData.info.display

    let displayName = 'anon'

    if (displayField && displayField.type === 'Raw') {
      // Convert bytes to string
      displayName = new TextDecoder().decode(displayField.value)
    }

    // Clean up
    displayName = displayName.trim()

    // Cache result
    identityCache.set(accountId, { display: displayName, timestamp: Date.now() })

    return { display: displayName, hasIdentity: true }
  } catch (error) {
    console.error('[identity] Error fetching identity for', accountId, error)
    return { display: 'anon', hasIdentity: false }
  } finally {
    if (client) {
      client.destroy()
    }
  }
}

export async function getIdentitiesBatch(accountIds: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>()

  // Check cache first
  const uncachedIds: string[] = []
  for (const accountId of accountIds) {
    const cached = identityCache.get(accountId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      results.set(accountId, cached.display)
    } else {
      uncachedIds.push(accountId)
    }
  }

  if (uncachedIds.length === 0) {
    return results
  }

  let client: any = null

  try {
    client = createClient(getWsProvider(PEOPLE_CHAIN_RPC))
    const api = client.getTypedApi(people)

    // Batch query
    const identityPromises = uncachedIds.map(accountId =>
      api.query.Identity.IdentityOf.getValue(accountId)
    )

    const identities = await Promise.all(identityPromises)

    // Process results
    for (let i = 0; i < uncachedIds.length; i++) {
      const accountId = uncachedIds[i]
      const identityData = identities[i]

      let displayName = 'anon'

      if (identityData && identityData.info.display) {
        const displayField = identityData.info.display
        if (displayField.type === 'Raw') {
          displayName = new TextDecoder().decode(displayField.value).trim()
        }
      }

      identityCache.set(accountId, { display: displayName, timestamp: Date.now() })
      results.set(accountId, displayName)
    }
  } catch (error) {
    console.error('[identity] Error fetching batch identities:', error)
    for (const accountId of uncachedIds) {
      if (!results.has(accountId)) {
        results.set(accountId, 'anon')
      }
    }
  } finally {
    if (client) {
      client.destroy()
    }
  }

  return results
}

export function clearIdentityCache(): void {
  identityCache.clear()
}
```

**Key Changes:**
1. `ApiPromise.create()` → `createClient()` + `getTypedApi()`
2. `api.query.identity.identityOf()` → `api.query.Identity.IdentityOf.getValue()`
3. `isEmpty` check → null check
4. Type parsing: Generated types may differ, check actual structure
5. `disconnect()` → `destroy()`

---

### 2. Balance Checking (`src/lib/validation.ts`)

#### Current Implementation

```typescript
const provider = new WsProvider(rpcEndpoint)
const api = await ApiPromise.create({ provider })

const accountInfo = await api.query.system.account(address)
const balance = accountInfo.data
const free = balance.free.toBigInt()
```

#### PAPI Implementation

```typescript
// src/lib/validation-papi.ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { dot } from "@polkadot-api/descriptors"

const MIN_BALANCE_PLANCK = BigInt('1000000000') // 0.1 DOT

export async function checkAccountBalance(
  address: string
): Promise<{ hasBalance: boolean; balance: string; balancePlanck: bigint }> {
  let client: any = null

  try {
    const rpcEndpoint = process.env.RPC_ENDPOINT

    if (!rpcEndpoint) {
      throw new Error('RPC_ENDPOINT not configured')
    }

    console.log(`[checkAccountBalance] Using RPC: ${rpcEndpoint}`)

    client = createClient(getWsProvider(rpcEndpoint))
    const api = client.getTypedApi(dot)

    // Query account balance
    const accountInfo = await api.query.System.Account.getValue(address)

    // Extract free balance
    const free = accountInfo.data.free

    // Convert to DOT (10 decimals for Asset Hub)
    const balanceDOT = Number(free) / 1e10

    console.log(`[checkAccountBalance] Address ${address} has ${balanceDOT} DOT`)

    return {
      hasBalance: free >= MIN_BALANCE_PLANCK,
      balance: balanceDOT.toFixed(4),
      balancePlanck: free
    }
  } catch (error) {
    console.error('Error checking balance:', error)
    throw new Error('Failed to check account balance')
  } finally {
    if (client) {
      client.destroy()
    }
  }
}
```

**Key Changes:**
1. Query method: `api.query.system.account()` → `api.query.System.Account.getValue()`
2. Type handling: PAPI returns typed values directly (no `.toBigInt()` call needed)
3. Balance is already a `bigint` in PAPI

---

### 3. Minting Operations (`src/lib/mint.ts`)

This is the most complex migration. Break it into sections:

#### Section A: Setup & Queries

**Current:**
```typescript
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'

const api = await ApiPromise.create({
  provider: new WsProvider(ASSET_HUB_WS)
})

const keyring = new Keyring({ type: 'sr25519' })
const charlie = keyring.addFromUri(PROXY_SEED)

// Queries
const proxyResult = await api.query.proxy.proxies(bobAddress)
const accountInfo = await api.query.system.account(charlie.address)
const items = await api.query.nfts.item.entries(COLLECTION_ID)
```

**PAPI:**
```typescript
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { dot } from "@polkadot-api/descriptors"
import { sr25519CreateDerive } from '@polkadot-api/substrate-bindings'
import { getPolkadotSigner } from "polkadot-api/signer"

// Create client
const client = createClient(getWsProvider(ASSET_HUB_WS))
const api = client.getTypedApi(dot)

// Create signer from seed
const derive = sr25519CreateDerive(PROXY_SEED)
const charlie = getPolkadotSigner(
  derive.publicKey,
  'sr25519',
  derive.sign
)

// Get address (need to encode publicKey to SS58)
import { getPolkadotAddress } from '@polkadot-api/utils'
const charlieAddress = getPolkadotAddress(derive.publicKey, 0) // 0 = Polkadot prefix

// Queries
const proxyData = await api.query.Proxy.Proxies.getValue(bobAddress)
const accountInfo = await api.query.System.Account.getValue(charlieAddress)
const items = await api.query.Nfts.Item.getEntries(COLLECTION_ID)
```

#### Section B: Transaction Building

**Current:**
```typescript
const mintCall = api.tx.nfts.forceMint(COLLECTION_ID, nextId, recipientAddress, null)
const setMetadataCall = api.tx.nfts.setMetadata(COLLECTION_ID, nextId, metadata)
const lockTransferCall = api.tx.nfts.lockItemTransfer(COLLECTION_ID, nextId)

const batchCall = api.tx.utility.batchAll([
  mintCall,
  setMetadataCall,
  lockTransferCall
])

const proxyCall = api.tx.proxy.proxy(
  bobAddress,
  null,
  batchCall
)
```

**PAPI:**
```typescript
// Build calls
const mintCall = api.tx.Nfts.force_mint({
  collection: COLLECTION_ID,
  item: nextId,
  mint_to: recipientAddress,
  item_config: undefined // null becomes undefined
})

const setMetadataCall = api.tx.Nfts.set_metadata({
  collection: COLLECTION_ID,
  item: nextId,
  data: metadata
})

const lockTransferCall = api.tx.Nfts.lock_item_transfer({
  collection: COLLECTION_ID,
  item: nextId
})

// Batch calls
const batchCall = api.tx.Utility.batch_all({
  calls: [mintCall, setMetadataCall, lockTransferCall]
})

// Proxy call
const proxyCall = api.tx.Proxy.proxy({
  real: bobAddress,
  force_proxy_type: undefined, // null
  call: batchCall
})
```

#### Section C: Transaction Submission & Events

**Current:**
```typescript
await new Promise<MintResult>((resolve, reject) => {
  proxyCall.signAndSend(charlie, (result) => {
    const { status, events, dispatchError } = result

    if (status.isInBlock) {
      // Check for errors
      if (dispatchError) {
        // Handle error
      }

      // Check events
      const mintSuccess = events.some(({ event }) =>
        api.events.nfts.Issued?.is(event)
      )

      if (mintSuccess) {
        resolve({ ... })
      }
    }
  })
})
```

**PAPI:**
```typescript
// Option 1: Simple submit and wait
const txHash = await proxyCall.signSubmitAndWatch(charlie).pipe(
  filter(event => event.type === 'finalized'),
  first()
).toPromise()

// Option 2: With full event handling
await new Promise<MintResult>((resolve, reject) => {
  const subscription = proxyCall.signSubmitAndWatch(charlie).subscribe({
    next: (event) => {
      if (event.type === 'txBestBlocksState') {
        // In best block
        console.log('In block:', event.block.hash)

        // Decode events
        const events = event.block.events

        // Check for errors
        const failed = events.find(e =>
          e.type === 'System' && e.value.type === 'ExtrinsicFailed'
        )

        if (failed) {
          subscription.unsubscribe()
          reject(new Error('Transaction failed'))
          return
        }

        // Check for success events
        const issuedEvent = events.find(e =>
          e.type === 'Nfts' && e.value.type === 'Issued'
        )

        if (issuedEvent) {
          subscription.unsubscribe()
          resolve({
            success: true,
            nftId: nextId,
            transactionHash: event.block.hash,
            // ... other fields
          })
        }
      }
    },
    error: (err) => reject(err)
  })
})
```

#### Complete PAPI Mint Implementation

```typescript
// src/lib/mint-papi.ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { dot } from "@polkadot-api/descriptors"
import { sr25519CreateDerive } from '@polkadot-api/substrate-bindings'
import { getPolkadotSigner } from "polkadot-api/signer"
import { getPolkadotAddress } from '@polkadot-api/utils'
import { filter, first } from 'rxjs'

export async function mintNFT(
  email: string,
  recipientAddress: string,
  config: MintConfig = {}
): Promise<MintResult> {
  const {
    COLLECTION_ID = parseInt(process.env.COLLECTION_ID || '662'),
    ASSET_HUB_WS = process.env.RPC_ENDPOINT || 'wss://polkadot-asset-hub-rpc.polkadot.io',
    PROXY_SEED = process.env.PROXY_SEED,
    COLLECTION_OWNER_ADDRESS = process.env.COLLECTION_OWNER_ADDRESS,
    PINATA_JWT = process.env.PINATA_JWT
  } = config

  // Validation (same as before)
  // ...

  let client: any = null

  try {
    // Create client
    client = createClient(getWsProvider(ASSET_HUB_WS))
    const api = client.getTypedApi(dot)

    // Create signer
    const derive = sr25519CreateDerive(PROXY_SEED!)
    const charlie = getPolkadotSigner(
      derive.publicKey,
      'sr25519',
      derive.sign
    )
    const charlieAddress = getPolkadotAddress(derive.publicKey, 0)

    // Verify proxy
    const proxyData = await api.query.Proxy.Proxies.getValue(COLLECTION_OWNER_ADDRESS!)

    const hasProxy = proxyData.some((p: any) =>
      p.delegate === charlieAddress &&
      (p.proxyType === 'AssetManager' || p.proxyType === 'Any')
    )

    if (!hasProxy) {
      throw new Error('Proxy not configured correctly')
    }

    // Check proxy balance
    const accountInfo = await api.query.System.Account.getValue(charlieAddress)
    const balanceDOT = Number(accountInfo.data.free) / 1e10
    console.log(`[mint] Proxy balance: ${balanceDOT.toFixed(4)} DOT`)

    // Get next NFT ID
    const items = await api.query.Nfts.Item.getEntries(COLLECTION_ID)
    let nextId = 0
    if (items.length > 0) {
      const existingIds = items.map(([key, value]) => key.item)
      nextId = Math.max(...existingIds) + 1
    }

    // Generate hash and tier info (same as before)
    const hashInput = `${email.toLowerCase()}:${COLLECTION_ID}:${nextId}`
    const hash = '0x' + crypto.createHash('sha256').update(hashInput).digest('hex')
    const tierInfo = calculateTierFromHash(hash)

    // Upload to IPFS (same as before)
    // ...

    // Build transaction
    const mintCall = api.tx.Nfts.force_mint({
      collection: COLLECTION_ID,
      item: nextId,
      mint_to: recipientAddress,
      item_config: undefined
    })

    const setMetadataCall = api.tx.Nfts.set_metadata({
      collection: COLLECTION_ID,
      item: nextId,
      data: metadata
    })

    const lockTransferCall = api.tx.Nfts.lock_item_transfer({
      collection: COLLECTION_ID,
      item: nextId
    })

    const batchCall = api.tx.Utility.batch_all({
      calls: [mintCall, setMetadataCall, lockTransferCall]
    })

    const proxyCall = api.tx.Proxy.proxy({
      real: COLLECTION_OWNER_ADDRESS!,
      force_proxy_type: undefined,
      call: batchCall
    })

    // Submit transaction
    console.log('[mint] Submitting transaction...')

    const result = await new Promise<MintResult>((resolve, reject) => {
      const subscription = proxyCall.signSubmitAndWatch(charlie).subscribe({
        next: (event) => {
          if (event.type === 'finalized' || event.type === 'txBestBlocksState') {
            const blockEvents = event.type === 'finalized'
              ? event.events
              : event.block.events

            // Check for failures
            const failed = blockEvents.find((e: any) =>
              e.type === 'System' && e.value.type === 'ExtrinsicFailed'
            )

            if (failed) {
              subscription.unsubscribe()
              reject(new Error('Transaction failed'))
              return
            }

            // Check for success
            const issued = blockEvents.find((e: any) =>
              e.type === 'Nfts' && e.value.type === 'Issued'
            )

            const proxyExecuted = blockEvents.find((e: any) =>
              e.type === 'Proxy' && e.value.type === 'ProxyExecuted'
            )

            if (issued && proxyExecuted) {
              console.log('[mint] ✅ NFT minted successfully')
              subscription.unsubscribe()

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
                transactionHash: event.type === 'finalized'
                  ? event.block.hash
                  : event.block.hash,
                collectionId: COLLECTION_ID
              })
            }
          }
        },
        error: (err) => {
          console.error('[mint] Transaction error:', err)
          reject(err)
        }
      })
    })

    // Record in database (same as before)
    // ...

    return result
  } finally {
    if (client) {
      client.destroy()
    }
  }
}
```

---

### 4. Utility Scripts (`scripts/check-proxy-balance.ts`)

Similar to balance checking, but simpler:

```typescript
// scripts/check-proxy-balance-papi.ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { dot } from "@polkadot-api/descriptors"
import { sr25519CreateDerive } from '@polkadot-api/substrate-bindings'
import { getPolkadotAddress } from '@polkadot-api/utils'

async function checkProxyBalance() {
  const PROXY_SEED = process.env.PROXY_SEED!
  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'wss://polkadot-asset-hub-rpc.polkadot.io'

  console.log('🔍 Checking proxy account balance...\n')

  let client: any = null

  try {
    client = createClient(getWsProvider(RPC_ENDPOINT))
    const api = client.getTypedApi(dot)

    const derive = sr25519CreateDerive(PROXY_SEED)
    const address = getPolkadotAddress(derive.publicKey, 0)

    console.log(`Proxy Address: ${address}\n`)

    const accountInfo = await api.query.System.Account.getValue(address)
    const free = accountInfo.data.free
    const reserved = accountInfo.data.reserved

    const freeDOT = Number(free) / 1e10
    const reservedDOT = Number(reserved) / 1e10
    const totalDOT = freeDOT + reservedDOT

    console.log('==========================================')
    console.log('💰 Balance Information')
    console.log('==========================================')
    console.log(`Free Balance:     ${freeDOT.toFixed(4)} DOT`)
    console.log(`Reserved Balance: ${reservedDOT.toFixed(4)} DOT`)
    console.log(`Total Balance:    ${totalDOT.toFixed(4)} DOT`)
    console.log('==========================================\n')

    // Rest of logic same...
  } finally {
    if (client) {
      client.destroy()
    }
  }
}
```

---

## Common Patterns & Gotchas

### 1. Type Names

PAPI uses PascalCase for pallet and call names:
- `system` → `System`
- `nfts` → `Nfts`
- `forceMint` → `force_mint`

### 2. Optional Values

- pjs: `null`
- PAPI: `undefined`

### 3. Query Methods

- pjs: `api.query.pallet.storage(args)`
- PAPI: `api.query.Pallet.Storage.getValue(args)`

### 4. Storage Entries

- pjs: `api.query.pallet.storage.entries(prefix)`
- PAPI: `api.query.Pallet.Storage.getEntries(prefix)`

### 5. Events

pjs:
```typescript
api.events.nfts.Issued.is(event)
```

PAPI:
```typescript
event.type === 'Nfts' && event.value.type === 'Issued'
```

### 6. Transaction Watching

pjs uses callbacks:
```typescript
tx.signAndSend(signer, (result) => { })
```

PAPI uses observables:
```typescript
tx.signSubmitAndWatch(signer).subscribe({ next: (event) => { } })
```

### 7. Disconnection

- pjs: `await api.disconnect()`
- PAPI: `client.destroy()`

---

## Migration Checklist

For each file:

- [ ] Import PAPI packages instead of pjs-api
- [ ] Generate chain descriptors if needed
- [ ] Replace `ApiPromise.create()` with `createClient()` + `getTypedApi()`
- [ ] Replace Keyring with sr25519CreateDerive
- [ ] Update query calls to typed API
- [ ] Update transaction building
- [ ] Update event handling
- [ ] Replace `disconnect()` with `destroy()`
- [ ] Update type assertions
- [ ] Test thoroughly

---

## Testing Strategy

1. Keep old implementation alongside new during development
2. Run regression tests against both
3. Compare outputs
4. Switch imports once tests pass
5. Remove old implementation

---

## Rollback Plan

If migration fails:
1. Keep pjs-api installed
2. Use git to revert changes
3. Investigate issues
4. Try again with fixes

## Resources

- [PAPI Documentation](https://papi.how)
- [Type Generation](https://papi.how/typed)
- [Transaction Guide](https://papi.how/transactions)
- [Signing Guide](https://papi.how/signing)
