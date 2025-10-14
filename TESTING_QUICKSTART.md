# Testing Quick Start

## TL;DR

```bash
# Terminal 1: Start Chopsticks (forks Asset Hub)
npm run chopsticks

# Terminal 2: Wait 5 seconds, then run tests
npm test
```

## What This Does

- **Forks Asset Hub** to `ws://localhost:8000` (for testing minting transactions)
- **Connects to real People chain** at `wss://polkadot-people-rpc.polkadot.io` (read-only for identities)
- **Funds test accounts** (Alice, Bob) with 1 DOT each on the forked Asset Hub

## Why This Setup?

1. **Asset Hub fork** - We need to test transactions (minting NFTs) without spending real DOT
2. **Real People chain** - We're only reading identities, no need to fork
3. **No Relay chain** - Not using XCM, so relay chain not needed

## Test Suites

### Identity Tests (29 tests)
Tests identity lookups from **real People chain**:
- ✅ Fetches real identities (Gavin Wood, Joe Petrowski, etc.)
- ✅ Returns "anon" for accounts without identity
- ✅ Batch lookups and caching

```bash
npm run test:identity
```

### Balance Tests (23 tests)
Tests balance checks on **forked Asset Hub**:
- ✅ Checks funded accounts (Alice: 1 DOT, Bob: 1 DOT)
- ✅ Validates address format
- ✅ Tests balance thresholds (0.1 DOT minimum)

```bash
npm run test:balance
```

## Configuration

All test configuration is in `.env.test`:

```env
# Asset Hub (forked)
RPC_ENDPOINT=ws://localhost:8000

# People Chain (real)
PEOPLE_CHAIN_RPC=wss://polkadot-people-rpc.polkadot.io

# Test accounts
COLLECTION_ID=662
PROXY_SEED=//Alice
```

## Next Steps

Once tests pass:
1. Install PAPI: `npm install polkadot-api`
2. Generate descriptors: `npx papi add asset-hub -w ws://localhost:8000`
3. Start migrating files from `@polkadot/api` to PAPI
4. Run tests after each migration to catch regressions

See [PAPI_MIGRATION_PLAN.md](PAPI_MIGRATION_PLAN.md) for full migration strategy.
