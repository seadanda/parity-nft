# PAPI Migration Plan

## Executive Summary

This document outlines the plan to migrate from `@polkadot/api` (pjs-api) to `polkadot-api` (PAPI) for all on-chain interactions in the Parity 10 Years NFT project.

---

## Current State Analysis

### Files Using @polkadot/api

1. **src/lib/identity.ts** - Identity lookups from People chain
2. **src/lib/validation.ts** - Balance checking on Polkadot relay chain
3. **src/lib/mint.ts** - NFT minting operations on Asset Hub
4. **scripts/check-proxy-balance.ts** - Proxy account balance monitoring

### Chain Interactions Breakdown

#### 1. Identity Lookups (People Chain)
**File:** `src/lib/identity.ts`
**RPC Endpoint:** `wss://polkadot-people-rpc.polkadot.io`
**Operations:**
- `api.query.identity.identityOf(accountId)` - Fetch identity information
- **Used in:** Frontend (gallery, NFT viewer) and mint form validation

#### 2. Balance Checking (Polkadot Relay Chain via Asset Hub)
**File:** `src/lib/validation.ts`
**RPC Endpoint:** `process.env.RPC_ENDPOINT` (Asset Hub: `wss://polkadot-asset-hub-rpc.polkadot.io`)
**Operations:**
- `api.query.system.account(address)` - Check account balance
- **Used in:** Mint form validation (checking 0.1 DOT minimum)

#### 3. NFT Minting (Asset Hub)
**File:** `src/lib/mint.ts`
**RPC Endpoint:** `wss://polkadot-asset-hub-rpc.polkadot.io`
**Operations:**
- **Queries:**
  - `api.query.proxy.proxies(bobAddress)` - Verify proxy relationship
  - `api.query.system.account(charlie.address)` - Check proxy account balance
  - `api.query.nfts.item.entries(COLLECTION_ID)` - Get next NFT ID
- **Transactions:**
  - `api.tx.nfts.forceMint()` - Mint NFT
  - `api.tx.nfts.setMetadata()` - Set NFT metadata
  - `api.tx.nfts.lockItemTransfer()` - Lock NFT transfer
  - `api.tx.utility.batchAll()` - Batch operations
  - `api.tx.proxy.proxy()` - Execute via proxy
  - `signAndSend()` - Sign and submit transaction
- **Event Handling:**
  - `events.nfts.Issued` - NFT minted event
  - `events.proxy.ProxyExecuted` - Proxy execution result
- **Keyring:**
  - `Keyring({ type: 'sr25519' })` - SR25519 keypair management
  - `keyring.addFromUri(PROXY_SEED)` - Load signing key

#### 4. Utility Scripts
**File:** `scripts/check-proxy-balance.ts`
**Operations:**
- `api.query.system.account()` - Check proxy balance
- Uses Keyring for account derivation

---

## PAPI Overview

### Key Differences from pjs-api

1. **Type-Safe:** Generated TypeScript types from chain metadata
2. **Better Performance:** Optimized RPC handling and caching
3. **Modern API:** Uses observables and async iterators
4. **Lighter Weight:** Smaller bundle size
5. **Chain Descriptors:** Pre-generated chain configurations

### PAPI Architecture

```typescript
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/web" // or /node
import { dot } from "@polkadot-api/descriptors" // chain-specific types

// Create client
const client = createClient(getWsProvider("wss://..."))

// Get typed API
const api = client.getTypedApi(dot)

// Queries
const balance = await api.query.System.Account.getValue(address)

// Transactions
const tx = api.tx.Nfts.mint({ ... })
await tx.signAndSubmit(signer)
```

---

## Migration Strategy

### Phase 1: Preparation (Pre-Migration)

#### 1.1 Set Up Testing Infrastructure
- Install test dependencies (vitest or jest)
- Set up test environment with RPC access
- Create test data fixtures

#### 1.2 Write Regression Tests
Create comprehensive tests for all chain interactions:

**Test Categories:**
1. **Identity Tests** (`tests/identity.test.ts`)
   - Fetch identity with display name set
   - Fetch identity without display name (returns "anon")
   - Batch identity lookups
   - Cache behavior

2. **Balance Tests** (`tests/balance.test.ts`)
   - Check account with sufficient balance (>= 0.1 DOT)
   - Check account with insufficient balance (< 0.1 DOT)
   - Check non-existent account
   - Balance formatting (DOT conversion)

3. **Minting Tests** (`tests/mint.test.ts`)
   - Verify proxy relationship
   - Get next NFT ID
   - Mint NFT (full flow)
   - Event parsing (Issued, ProxyExecuted)
   - Error handling (insufficient balance, proxy errors)

4. **Keyring Tests** (`tests/keyring.test.ts`)
   - SR25519 key derivation from seed
   - Address encoding
   - Signing operations

**Test Data:**
- Use Polkadot testnet (Westend/Rococo) or local chain
- Known test accounts with identities
- Pre-funded test accounts

#### 1.3 Document Current Behavior
- Record exact RPC responses for key operations
- Document type structures
- Note edge cases and error handling

### Phase 2: PAPI Setup

#### 2.1 Install Dependencies
```bash
npm install polkadot-api
npm install @polkadot-api/descriptors
npm install @polkadot-api/ws-provider
```

#### 2.2 Generate Chain Descriptors
PAPI uses chain-specific type descriptors. Generate for:
- Polkadot Asset Hub
- Polkadot People Chain

```bash
npx papi add dot -w wss://polkadot-asset-hub-rpc.polkadot.io
npx papi add people -w wss://polkadot-people-rpc.polkadot.io
```

This creates type-safe APIs in `@polkadot-api/descriptors`

#### 2.3 Create PAPI Utilities
Create helper modules for common operations:
- `src/lib/papi-client.ts` - Client factory and connection management
- `src/lib/papi-signer.ts` - Signing key management (replacement for Keyring)

### Phase 3: Migration (File by File)

#### 3.1 Migrate Identity Lookups
**File:** `src/lib/identity.ts`
**Complexity:** Low
**Priority:** High (used in multiple places)

**Changes:**
- Replace `ApiPromise.create()` with `createClient()`
- Replace `api.query.identity.identityOf()` with typed equivalent
- Update type handling for identity data
- Maintain cache logic

**Testing:**
- Run identity tests with both implementations
- Verify frontend components (gallery, NFT viewer) work correctly

#### 3.2 Migrate Balance Checking
**File:** `src/lib/validation.ts`
**Complexity:** Low
**Priority:** High (blocks minting)

**Changes:**
- Replace API creation
- Replace `api.query.system.account()` with typed equivalent
- Update balance extraction logic
- Maintain error handling

**Testing:**
- Run balance tests
- Test mint form validation flow

#### 3.3 Migrate Minting Operations
**File:** `src/lib/mint.ts`
**Complexity:** High (most complex file)
**Priority:** Critical

**Changes:**
- Replace API creation
- Replace all query operations:
  - `proxy.proxies()` → Typed query
  - `system.account()` → Typed query
  - `nfts.item.entries()` → Typed storage iteration
- Replace transaction building:
  - `tx.nfts.forceMint()` → Typed transaction
  - `tx.nfts.setMetadata()` → Typed transaction
  - `tx.nfts.lockItemTransfer()` → Typed transaction
  - `tx.utility.batchAll()` → Typed batch
  - `tx.proxy.proxy()` → Typed proxy call
- Replace Keyring with PAPI signer:
  - SR25519 key derivation
  - Signing operations
- Update event handling:
  - Parse events from transaction result
  - Handle errors

**Testing:**
- Run full mint test flow
- Test error scenarios
- Verify on-chain results match expected behavior

#### 3.4 Migrate Utility Scripts
**File:** `scripts/check-proxy-balance.ts`
**Complexity:** Low
**Priority:** Low (non-critical utility)

**Changes:**
- Same pattern as balance checking
- Update output formatting

### Phase 4: Verification

#### 4.1 Run All Tests
- Execute full regression test suite
- Compare results with pjs-api baseline
- Fix any discrepancies

#### 4.2 Integration Testing
- Test full user flow: mint form → validation → minting → gallery
- Test identity lookups across all pages
- Verify error handling

#### 4.3 Performance Testing
- Compare RPC call performance
- Check bundle size reduction
- Verify caching works correctly

### Phase 5: Cleanup

#### 5.1 Remove Old Dependencies
```bash
npm uninstall @polkadot/api
npm uninstall @polkadot/util-crypto
npm uninstall @polkadot/keyring
```

#### 5.2 Update Documentation
- Update README with new dependencies
- Document PAPI usage patterns
- Add migration notes

---

## Risk Assessment

### High Risk Areas

1. **Transaction Signing**
   - Critical for minting operations
   - Different signing API in PAPI
   - Must maintain compatibility with SR25519

2. **Event Handling**
   - Event parsing differs between libraries
   - Must correctly detect mint success/failure
   - Proxy execution result handling

3. **Type Conversion**
   - Different type systems
   - Balance conversion (BigInt handling)
   - AccountId encoding

### Mitigation Strategies

1. **Comprehensive Testing**
   - Test on testnet before production
   - Have rollback plan (keep pjs-api branch)

2. **Gradual Migration**
   - Migrate one file at a time
   - Keep both implementations running in parallel during transition
   - Use feature flags if needed

3. **Monitoring**
   - Log all chain interactions during initial deployment
   - Monitor error rates
   - Track transaction success rates

---

## Implementation Timeline

### Week 1: Preparation
- Day 1-2: Set up test infrastructure
- Day 3-5: Write regression tests
- Day 6-7: Verify all tests pass with current implementation

### Week 2: Migration
- Day 1-2: Install PAPI, generate descriptors, create utilities
- Day 3: Migrate identity lookups
- Day 4: Migrate balance checking
- Day 5-7: Migrate minting operations

### Week 3: Verification & Cleanup
- Day 1-2: Integration testing
- Day 3: Performance testing
- Day 4-5: Bug fixes
- Day 6-7: Remove old dependencies, update docs

---

## Open Questions

1. **Chain Descriptors:**
   - Do we need custom descriptors or can we use standard ones?
   - How to handle descriptor updates?

2. **Keyring Replacement:**
   - What's the PAPI equivalent for SR25519 keypair management?
   - How to derive keys from seed phrases?

3. **Backwards Compatibility:**
   - Do we need to support both APIs during transition?
   - What's the rollback strategy?

4. **Testing Environment:**
   - Use testnet or local chain for tests?
   - How to handle test data setup?

---

## Next Steps

1. ✅ Create this migration plan
2. ⏳ Review plan with team
3. ⏳ Set up test infrastructure
4. ⏳ Write regression tests
5. ⏳ Begin Phase 2 (PAPI setup)

---

## Resources

- [PAPI Documentation](https://papi.how)
- [PAPI GitHub](https://github.com/polkadot-api/polkadot-api)
- [Migration Guide](https://papi.how/migration-from-pjs)
- [Type Generation](https://papi.how/typed)
