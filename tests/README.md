# Testing Guide

## Overview

This directory contains regression tests for the PAPI migration. Tests verify that all chain interactions work correctly with both `@polkadot/api` (current) and `polkadot-api` (target).

## Prerequisites

1. **Node.js** - v18 or higher
2. **Dependencies** - `npm install`
3. **Chopsticks** - For forking Polkadot chains locally

## Running Tests

### Start Chopsticks

Before running tests, start the multi-chain Chopsticks fork:

```bash
# Terminal 1: Start Chopsticks
npm run chopsticks
# OR
just fork-multi
```

This will fork:
- **Polkadot Relay Chain** - `ws://localhost:8000`
- **Asset Hub** - `ws://localhost:8001`
- **People Chain** - `ws://localhost:8002`

Wait for Chopsticks to display "Listening on..." messages before running tests.

### Run Tests

```bash
# Run all tests
npm test

# Run tests with UI (recommended for development)
npm run test:ui

# Run specific test suites
npm run test:identity    # Identity lookups
npm run test:balance     # Balance checking

# Run tests once (CI mode)
npm run test:run

# Using just
just test                # Run all tests
just test-identity       # Run identity tests only
just test-balance        # Run balance tests only
```

## Test Structure

```
tests/
├── setup.ts                 # Global test configuration
├── fixtures/
│   └── accounts.ts         # Test account data
├── identity.test.ts        # Identity lookup tests (People chain)
├── balance.test.ts         # Balance checking tests (Asset Hub)
└── mint.test.ts           # Minting tests (Asset Hub) - TODO
```

## Test Accounts

### Real Accounts (with identities)
- **Gavin Wood** - `15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5`
- **Joe Petrowski** - `1363HWTPzDrzAQ6ChFiMU6mP4b6jmQid2ae55JQcKtZnpLGv`

### Test Accounts (funded on Chopsticks)
- **Alice** - `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` (1 DOT)
- **Bob** - `5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty` (1 DOT)
- **Charlie, Dave** - Unfunded

## Configuration

Tests use `.env.test` for configuration:

```env
RPC_ENDPOINT=ws://localhost:8001           # Asset Hub
PEOPLE_CHAIN_RPC=ws://localhost:8002       # People Chain
COLLECTION_ID=662
PROXY_SEED=//Alice
```

## Test Suites

### 1. Identity Lookups (`identity.test.ts`)

Tests identity fetching from People chain:
- ✅ Fetch identity with display name
- ✅ Handle accounts without identity ("anon")
- ✅ Batch identity lookups
- ✅ Cache behavior
- ✅ Error handling

**Expected Results:**
- Real accounts return their on-chain identity names
- Test accounts return "anon"
- Cache speeds up repeated lookups
- Batch is more efficient than individual calls

### 2. Balance Checking (`balance.test.ts`)

Tests balance queries on Asset Hub:
- ✅ Check accounts with sufficient balance (>= 0.1 DOT)
- ✅ Check accounts with insufficient balance
- ✅ Balance formatting (4 decimal places)
- ✅ Planck <-> DOT conversion
- ✅ Address validation
- ✅ Error handling

**Expected Results:**
- Alice and Bob have ~1 DOT (funded in config)
- Charlie and Dave have 0 DOT
- Format: `X.XXXX DOT`
- `hasBalance` is true for >= 0.1 DOT

### 3. Minting Operations (`mint.test.ts`) - TODO

Will test full NFT minting flow:
- Proxy verification
- NFT ID generation
- Transaction submission
- Event parsing
- Error scenarios

## Debugging

### Verbose Output

Enable verbose logging:

```bash
VERBOSE_TESTS=true npm test
```

### Check Chopsticks Connection

```bash
# Test connection manually
npx @polkadot/api-cli --ws ws://localhost:8001 query.system.account Alice
```

### Common Issues

**1. "Connection refused" errors**
- Ensure Chopsticks is running (`npm run chopsticks`)
- Wait for "Listening on..." messages before running tests

**2. "Account has 0 balance" errors**
- Check `chopsticks-config-asset-hub.yml` has funded accounts
- Restart Chopsticks to reload config

**3. "Identity not found" errors**
- Verify People chain is forked (`ws://localhost:8002`)
- Check account addresses are correct

**4. Timeout errors**
- RPC calls can be slow, especially first connection
- Tests have 60s timeout - increase if needed in `vitest.config.ts`

## Migration Process

1. ✅ **Phase 1: Baseline Tests (Current)**
   - Write tests for current `@polkadot/api` implementation
   - Verify all tests pass
   - Document expected behavior

2. ⏳ **Phase 2: PAPI Implementation**
   - Install PAPI dependencies
   - Generate chain descriptors
   - Implement PAPI versions alongside pjs-api

3. ⏳ **Phase 3: Verification**
   - Run tests with PAPI implementation
   - Compare results with baseline
   - Fix discrepancies

4. ⏳ **Phase 4: Cleanup**
   - Remove `@polkadot/api` dependency
   - Update all imports to use PAPI
   - Final test run

## Performance Benchmarks

Target performance for operations:

| Operation | Target | Current (pjs-api) | PAPI |
|-----------|--------|-------------------|------|
| Identity lookup | < 2s | TBD | TBD |
| Batch identity (4) | < 3s | TBD | TBD |
| Balance check | < 2s | TBD | TBD |
| NFT mint | < 30s | TBD | TBD |

Run tests to populate benchmarks.

## Contributing

When adding new tests:

1. Add test file in `tests/` directory
2. Import setup from `tests/setup.ts`
3. Use fixtures from `tests/fixtures/`
4. Add test script to `package.json`
5. Update this README

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Chopsticks Documentation](https://github.com/AcalaNetwork/chopsticks)
- [PAPI Documentation](https://papi.how)
- [Polkadot.js API](https://polkadot.js.org/docs/api/)
