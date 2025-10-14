# Regression Test Plan for PAPI Migration

## Overview

This document outlines comprehensive regression tests to ensure the migration from `@polkadot/api` to `polkadot-api` (PAPI) maintains all existing functionality.

---

## Test Environment Setup

### Prerequisites

```bash
# Install test framework
npm install --save-dev vitest @vitest/ui
npm install --save-dev @polkadot/api @polkadot/util-crypto  # Keep during migration
npm install --save-dev dotenv

# Test environment variables
cp .env.example .env.test
```

### Test Configuration

**File:** `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // RPC calls can be slow
    hookTimeout: 30000,
    setupFiles: ['./tests/setup.ts'],
  },
})
```

**File:** `tests/setup.ts`
```typescript
import { config } from 'dotenv'
config({ path: '.env.test' })

// Global test configuration
export const TEST_TIMEOUT = 30000
export const TEST_ACCOUNTS = {
  // Known accounts for testing
  WITH_IDENTITY: '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5',
  WITHOUT_IDENTITY: '13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB',
  WITH_BALANCE: '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5',
  WITHOUT_BALANCE: '16ZL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD',
}
```

---

## Test Suite 1: Identity Lookups

**File:** `tests/identity.test.ts`

### Test Cases

#### 1.1 Fetch Identity with Display Name
```typescript
describe('Identity Lookups', () => {
  test('should fetch identity with display name', async () => {
    const address = TEST_ACCOUNTS.WITH_IDENTITY
    const identity = await getIdentity(address)

    expect(identity.hasIdentity).toBe(true)
    expect(identity.display).not.toBe('anon')
    expect(typeof identity.display).toBe('string')
    expect(identity.display.length).toBeGreaterThan(0)
  })
})
```

**Success Criteria:**
- Returns `hasIdentity: true`
- Returns non-empty display name
- Display name is a string

#### 1.2 Fetch Identity Without Display Name
```typescript
test('should return "anon" for account without identity', async () => {
  const address = TEST_ACCOUNTS.WITHOUT_IDENTITY
  const identity = await getIdentity(address)

  expect(identity.hasIdentity).toBe(false)
  expect(identity.display).toBe('anon')
})
```

**Success Criteria:**
- Returns `hasIdentity: false`
- Returns "anon" as display name

#### 1.3 Batch Identity Lookup
```typescript
test('should fetch multiple identities in batch', async () => {
  const addresses = [
    TEST_ACCOUNTS.WITH_IDENTITY,
    TEST_ACCOUNTS.WITHOUT_IDENTITY,
  ]

  const identities = await getIdentitiesBatch(addresses)

  expect(identities.size).toBe(2)
  expect(identities.has(TEST_ACCOUNTS.WITH_IDENTITY)).toBe(true)
  expect(identities.has(TEST_ACCOUNTS.WITHOUT_IDENTITY)).toBe(true)
  expect(identities.get(TEST_ACCOUNTS.WITHOUT_IDENTITY)).toBe('anon')
})
```

**Success Criteria:**
- Returns Map with all requested addresses
- Correctly identifies accounts with/without identity
- Performs better than individual lookups

#### 1.4 Cache Behavior
```typescript
test('should cache identity lookups', async () => {
  const address = TEST_ACCOUNTS.WITH_IDENTITY

  // First call
  const start1 = Date.now()
  await getIdentity(address)
  const time1 = Date.now() - start1

  // Second call (cached)
  const start2 = Date.now()
  await getIdentity(address)
  const time2 = Date.now() - start2

  // Cached call should be significantly faster
  expect(time2).toBeLessThan(time1 / 10)
})
```

**Success Criteria:**
- Second call is significantly faster
- Cache expires after configured duration

#### 1.5 Error Handling
```typescript
test('should handle invalid address gracefully', async () => {
  const invalidAddress = 'invalid-address'
  const identity = await getIdentity(invalidAddress)

  expect(identity.display).toBe('anon')
  expect(identity.hasIdentity).toBe(false)
})

test('should handle RPC connection errors', async () => {
  // Mock RPC failure
  const identity = await getIdentity(TEST_ACCOUNTS.WITH_IDENTITY)

  // Should not throw, should return default
  expect(identity.display).toBeDefined()
})
```

**Success Criteria:**
- No exceptions thrown
- Returns default values on error

---

## Test Suite 2: Balance Checking

**File:** `tests/balance.test.ts`

### Test Cases

#### 2.1 Check Account with Sufficient Balance
```typescript
describe('Balance Checking', () => {
  test('should detect account with sufficient balance', async () => {
    const address = TEST_ACCOUNTS.WITH_BALANCE
    const result = await checkAccountBalance(address)

    expect(result.hasBalance).toBe(true)
    expect(parseFloat(result.balance)).toBeGreaterThanOrEqual(0.1)
    expect(result.balancePlanck).toBeGreaterThanOrEqual(BigInt('1000000000'))
  })
})
```

**Success Criteria:**
- `hasBalance` is true for accounts with >= 0.1 DOT
- Balance string is formatted correctly
- BigInt balance is accurate

#### 2.2 Check Account with Insufficient Balance
```typescript
test('should detect account with insufficient balance', async () => {
  const address = TEST_ACCOUNTS.WITHOUT_BALANCE
  const result = await checkAccountBalance(address)

  expect(result.hasBalance).toBe(false)
  expect(parseFloat(result.balance)).toBeLessThan(0.1)
})
```

**Success Criteria:**
- `hasBalance` is false for accounts with < 0.1 DOT
- Still returns balance information

#### 2.3 Balance Formatting
```typescript
test('should format balance correctly', async () => {
  const address = TEST_ACCOUNTS.WITH_BALANCE
  const result = await checkAccountBalance(address)

  expect(result.balance).toMatch(/^\d+\.\d{4}$/) // 4 decimal places

  // Convert balance to planck and back
  const balanceDOT = parseFloat(result.balance)
  const expectedPlanck = BigInt(Math.floor(balanceDOT * 1e10))
  expect(result.balancePlanck).toBeGreaterThanOrEqual(expectedPlanck)
})
```

**Success Criteria:**
- Balance formatted to 4 decimal places
- Conversion between DOT and planck is accurate

#### 2.4 Non-Existent Account
```typescript
test('should handle non-existent account', async () => {
  // Create a valid but non-existent address
  const nonExistentAddress = '16ZL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD'
  const result = await checkAccountBalance(nonExistentAddress)

  expect(result.hasBalance).toBe(false)
  expect(result.balance).toBe('0.0000')
  expect(result.balancePlanck).toBe(BigInt(0))
})
```

**Success Criteria:**
- Returns zero balance
- Does not throw error

#### 2.5 Invalid Address Handling
```typescript
test('should throw error for invalid address', async () => {
  const invalidAddress = 'not-an-address'

  await expect(checkAccountBalance(invalidAddress)).rejects.toThrow()
})
```

**Success Criteria:**
- Throws descriptive error
- Error is catchable

---

## Test Suite 3: Minting Operations

**File:** `tests/mint.test.ts`

### Test Cases

#### 3.1 Verify Proxy Relationship
```typescript
describe('Minting Operations', () => {
  test('should verify proxy relationship', async () => {
    // This test checks the proxy configuration
    // Without actually minting

    const COLLECTION_OWNER = process.env.COLLECTION_OWNER_ADDRESS!
    const PROXY_SEED = process.env.PROXY_SEED!

    // Connect to Asset Hub
    const api = await ApiPromise.create({
      provider: new WsProvider(process.env.RPC_ENDPOINT!)
    })

    const keyring = new Keyring({ type: 'sr25519' })
    const proxyAccount = keyring.addFromUri(PROXY_SEED)

    const proxies = await api.query.proxy.proxies(COLLECTION_OWNER)
    const proxyList = proxies[0]

    const hasProxy = proxyList.some(p =>
      p.delegate.toString() === proxyAccount.address &&
      (p.proxyType.toString() === 'AssetManager' || p.proxyType.toString() === 'Any')
    )

    expect(hasProxy).toBe(true)

    await api.disconnect()
  })
})
```

**Success Criteria:**
- Proxy relationship exists
- Proxy type is AssetManager or Any

#### 3.2 Get Next NFT ID
```typescript
test('should get next NFT ID correctly', async () => {
  const COLLECTION_ID = parseInt(process.env.COLLECTION_ID!)

  const api = await ApiPromise.create({
    provider: new WsProvider(process.env.RPC_ENDPOINT!)
  })

  const items = await api.query.nfts.item.entries(COLLECTION_ID)
  let nextId = 0

  if (items.length > 0) {
    const existingIds = items.map(([key]) => {
      const itemId = key.args[1]
      return itemId.toNumber()
    })
    nextId = Math.max(...existingIds) + 1
  }

  expect(nextId).toBeGreaterThanOrEqual(0)
  expect(Number.isInteger(nextId)).toBe(true)

  await api.disconnect()
})
```

**Success Criteria:**
- Returns valid integer ID
- ID is sequential (max + 1)

#### 3.3 Full Mint Flow (Integration Test)
```typescript
test('should mint NFT successfully', async () => {
  // This is a full integration test
  // Should only run against testnet

  const TEST_EMAIL = 'test@example.com'
  const TEST_WALLET = TEST_ACCOUNTS.WITH_BALANCE

  const result = await mintNFT(TEST_EMAIL, TEST_WALLET)

  // Verify result structure
  expect(result.success).toBe(true)
  expect(result.nftId).toBeGreaterThanOrEqual(0)
  expect(result.hash).toMatch(/^0x[a-f0-9]{64}$/)
  expect(result.tier).toBeTruthy()
  expect(result.rarity).toBeTruthy()
  expect(result.glassColor).toMatch(/^#[a-f0-9]{6}$/i)
  expect(result.glowColor).toMatch(/^#[a-f0-9]{6}$/i)
  expect(result.transactionHash).toMatch(/^0x[a-f0-9]{64}$/)
  expect(result.metadataUrl).toMatch(/^ipfs:\/\//)
  expect(result.collectionId).toBe(parseInt(process.env.COLLECTION_ID!))

  // Verify NFT exists on chain
  const api = await ApiPromise.create({
    provider: new WsProvider(process.env.RPC_ENDPOINT!)
  })

  const nftData = await api.query.nfts.item(result.collectionId, result.nftId)
  expect(nftData.isSome).toBe(true)

  const nft = nftData.unwrap()
  expect(nft.owner.toString()).toBe(TEST_WALLET)

  await api.disconnect()
}, 60000) // Longer timeout for full mint
```

**Success Criteria:**
- Mint succeeds
- All result fields are valid
- NFT exists on-chain
- NFT is owned by correct address

#### 3.4 Event Parsing
```typescript
test('should correctly parse mint events', async () => {
  // Test event parsing logic independently
  // This would be a unit test of the event handling code

  const mockEvents = [
    {
      event: {
        section: 'nfts',
        method: 'Issued',
        data: [COLLECTION_ID, NFT_ID, OWNER]
      }
    },
    {
      event: {
        section: 'proxy',
        method: 'ProxyExecuted',
        data: [{ isOk: true }]
      }
    }
  ]

  // Parse events
  const hasIssued = mockEvents.some(e =>
    e.event.section === 'nfts' && e.event.method === 'Issued'
  )
  const hasProxyExecuted = mockEvents.some(e =>
    e.event.section === 'proxy' && e.event.method === 'ProxyExecuted'
  )

  expect(hasIssued).toBe(true)
  expect(hasProxyExecuted).toBe(true)
})
```

**Success Criteria:**
- Correctly identifies Issued event
- Correctly identifies ProxyExecuted event
- Extracts error information if present

#### 3.5 Error Scenarios
```typescript
test('should handle insufficient proxy balance', async () => {
  // Mock low balance scenario
  // This would require test infrastructure to set up

  await expect(mintNFT(TEST_EMAIL, TEST_WALLET, {
    // Mock config with low balance
  })).rejects.toThrow(/balance/)
})

test('should handle already minted email', async () => {
  const TEST_EMAIL = 'already-minted@example.com'

  await expect(mintNFT(TEST_EMAIL, TEST_WALLET)).rejects.toThrow(/already minted/)
})

test('should handle non-whitelisted email', async () => {
  const TEST_EMAIL = 'not-whitelisted@example.com'

  await expect(mintNFT(TEST_EMAIL, TEST_WALLET)).rejects.toThrow(/not whitelisted/)
})
```

**Success Criteria:**
- Appropriate errors thrown
- Error messages are descriptive
- No partial state changes

---

## Test Suite 4: Keyring Operations

**File:** `tests/keyring.test.ts`

### Test Cases

#### 4.1 SR25519 Key Derivation
```typescript
describe('Keyring Operations', () => {
  test('should derive SR25519 key from seed', () => {
    const SEED = '//Alice'
    const keyring = new Keyring({ type: 'sr25519' })
    const alice = keyring.addFromUri(SEED)

    expect(alice.address).toBeTruthy()
    expect(alice.address.length).toBeGreaterThan(0)
    expect(alice.address.startsWith('5')).toBe(true) // Generic SS58
  })
})
```

**Success Criteria:**
- Key is derived successfully
- Address is valid SS58 format
- Deterministic (same seed = same address)

#### 4.2 Address Encoding
```typescript
test('should encode address with correct SS58 prefix', () => {
  const keyring = new Keyring({ type: 'sr25519' })
  const alice = keyring.addFromUri('//Alice')

  // Polkadot uses prefix 0
  const polkadotAddress = encodeAddress(alice.publicKey, 0)
  expect(polkadotAddress.startsWith('1')).toBe(true)
})
```

**Success Criteria:**
- Address uses correct network prefix
- Encoding is reversible

#### 4.3 Signing Operations
```typescript
test('should sign messages correctly', () => {
  const keyring = new Keyring({ type: 'sr25519' })
  const alice = keyring.addFromUri('//Alice')

  const message = 'test message'
  const signature = alice.sign(message)

  expect(signature).toBeTruthy()
  expect(signature.length).toBe(64) // SR25519 signature length
})
```

**Success Criteria:**
- Signature is generated
- Signature is correct length
- Signature is valid

---

## Test Suite 5: Integration Tests

**File:** `tests/integration.test.ts`

### Test Cases

#### 5.1 Full User Flow
```typescript
describe('Integration Tests', () => {
  test('complete mint flow from frontend to chain', async () => {
    // 1. Check identity
    const identity = await getIdentity(TEST_WALLET)
    expect(identity.display).toBeDefined()

    // 2. Check balance
    const balance = await checkAccountBalance(TEST_WALLET)
    expect(balance.hasBalance).toBe(true)

    // 3. Mint NFT
    const result = await mintNFT(TEST_EMAIL, TEST_WALLET)
    expect(result.success).toBe(true)

    // 4. Verify NFT appears in query
    // This would query the recent mints API
  }, 90000)
})
```

**Success Criteria:**
- All steps complete successfully
- Data flows correctly between steps

---

## Test Data Management

### Test Accounts Setup

Create test accounts with known states:

```typescript
// tests/fixtures/accounts.ts
export const TEST_ACCOUNTS = {
  alice: {
    seed: '//Alice',
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    hasIdentity: true,
    identityName: 'Alice',
    hasBalance: true,
  },
  bob: {
    seed: '//Bob',
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    hasIdentity: false,
    hasBalance: true,
  },
  charlie: {
    // Proxy account
    seed: process.env.PROXY_SEED,
    address: process.env.PROXY_ADDRESS,
  }
}
```

### Mock Data

```typescript
// tests/fixtures/nfts.ts
export const MOCK_NFT_RESULT = {
  success: true,
  nftId: 42,
  hash: '0x1234567890abcdef...',
  tier: 'Legendary',
  rarity: 'Ultra Rare (0.5%)',
  glassColor: '#FF00FF',
  glowColor: '#00FFFF',
  transactionHash: '0xabcdef...',
  metadataUrl: 'ipfs://Qm...',
  collectionId: 662,
}
```

---

## Test Execution Strategy

### Running Tests

```bash
# Run all tests
npm test

# Run specific suite
npm test identity

# Run with coverage
npm test -- --coverage

# Run in watch mode during development
npm test -- --watch
```

### Test Stages

1. **Unit Tests** - Fast, no RPC calls
   - Keyring operations
   - Data parsing
   - Type conversions

2. **Integration Tests** - Slow, require RPC
   - Identity lookups
   - Balance checks
   - Minting (testnet only)

3. **E2E Tests** - Full user flows
   - Complete mint process
   - Frontend interactions

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --reporter=verbose
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Success Metrics

### Coverage Goals
- **Unit Tests:** 90%+ coverage
- **Integration Tests:** All critical paths covered
- **E2E Tests:** All user flows covered

### Performance Benchmarks
- Identity lookup: < 2s
- Balance check: < 2s
- Mint operation: < 30s (depends on finalization)

### Regression Criteria
All tests must pass with both:
1. Current `@polkadot/api` implementation
2. New `polkadot-api` implementation

Any discrepancies must be:
- Documented
- Explained
- Verified as acceptable

---

## Next Steps

1. ✅ Create test plan
2. ⏳ Review test plan
3. ⏳ Set up test infrastructure (`vitest.config.ts`, test fixtures)
4. ⏳ Write tests for current implementation
5. ⏳ Verify all tests pass with pjs-api
6. ⏳ Begin PAPI migration with tests as safety net
