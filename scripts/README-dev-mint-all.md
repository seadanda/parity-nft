# Development Mint Script

## Overview

`dev-mint-all.ts` simulates the complete NFT minting process for all whitelisted users WITHOUT uploading to IPFS. This is useful for:

- Testing the full minting flow on testnet/devnet
- Verifying transaction batching and proxy calls
- Populating a test collection with NFTs
- Load testing the minting infrastructure

## Safety Features

✅ **Cannot run in production**
- Checks `NODE_ENV !== 'production'`
- Requires explicit `SKIP_IPFS_CHECK=true` flag

✅ **No IPFS uploads**
- Uses dummy IPFS URLs (`ipfs://QmDUMMY...`)
- No actual files uploaded to Pinata

✅ **Database protection**
- Does NOT update `whitelist.has_minted` flags
- Does NOT create mint records in database
- Users can still mint "for real" later

✅ **5-second confirmation delay**
- Gives you time to cancel with Ctrl+C

## Usage

### Basic Usage

```bash
npm run dev:mint-all
```

### What It Does

1. **Fetches whitelist** - Gets all users where `has_minted = 0`
2. **Generates test data** - Creates deterministic addresses, hashes, and tiers
3. **Mints on-chain** - Executes real blockchain transactions:
   - `force_mint` - Creates the NFT
   - `set_metadata` - Sets dummy IPFS metadata URL
   - `lock_item_transfer` - Makes NFT soulbound
   - `set_attribute` - Sets hash, tier, rarity attributes
4. **Uses proxy pattern** - Two proxy calls (AssetManager + AssetOwner)
5. **Prints summary** - Shows success/failure for each mint

### Environment Variables Required

```bash
RPC_ENDPOINT=wss://polkadot-asset-hub-rpc.polkadot.io
COLLECTION_ID=669
PROXY_SEED=your_proxy_seed_phrase
COLLECTION_OWNER_ADDRESS=your_collection_owner_address
```

### Output Example

```
🔧 Development Mint Script - Minting NFTs for all whitelisted users

⚠️  SAFETY CHECKS:
   - NODE_ENV: development
   - IPFS Upload: DISABLED (using dummy links)
   - Collection ID: 669

📋 Fetching whitelist...
   Total whitelisted: 100
   Already minted: 25
   To mint: 75

⚠️  This will mint NFTs on-chain for all unminted users.
   Press Ctrl+C to cancel, or wait 5 seconds to proceed...

🔗 Connecting to Asset Hub...
📊 Querying collection state...
   Current collection size: 25
   Starting NFT ID: 25

🎨 Minting for: alice@example.com
   Recipient: 15oF4uVJw...6Sp5
   Hash: 0x1a2b3c4d...
   Tier: Adamantite (Legendary)
   ⏳ Submitting transaction...
   ✅ Minted NFT #25 in block 0x123abc...

[... continues for all users ...]

============================================================
📊 MINTING SUMMARY
============================================================

Total: 75
✅ Successful: 73
❌ Failed: 2

Successful mints:
  - alice@example.com: NFT #25 (Adamantite)
  - bob@example.com: NFT #26 (Diamond)
  ...

Failed mints:
  - charlie@example.com: Insufficient balance
  - dave@example.com: Transaction timeout

⚠️  NOTE: These NFTs were minted with dummy IPFS metadata.
   Database has_minted flags were NOT updated.
   Use this only for development/testing!
```

## How It Works

### Deterministic Test Data

**Wallet Address**: Generated from email hash
```typescript
const hash = crypto.createHash('sha256').update(email).digest();
// Derives keypair from hash → consistent address per email
```

**NFT Hash**: Generated from email + NFT ID
```typescript
const hash = crypto.createHash('sha256')
  .update(email + nftId.toString())
  .digest();
// Determines tier/rarity
```

**Dummy IPFS URLs**:
```
Image:    ipfs://QmDUMMY000025/image.png
Metadata: ipfs://QmDUMMY000025/metadata.json
```

### Transaction Structure

```
batch_all([
  proxy(AssetManager, batch_all([
    force_mint(recipient, nftId),
    set_metadata(dummyMetadataUrl),
    lock_item_transfer(nftId)
  ])),
  proxy(AssetOwner, batch_all([
    set_attribute("hash", hash),
    set_attribute("tier", tierName),
    set_attribute("rarity", rarity)
  ]))
])
```

## When to Use

✅ **Good use cases:**
- Testing on Chopsticks local fork
- Testing on Westend Asset Hub testnet
- Verifying proxy permissions work correctly
- Load testing collection creation
- Generating test data for gallery/viewer

❌ **Do NOT use for:**
- Production minting (safety checks prevent this)
- Creating real NFTs with actual metadata
- Updating production database

## Differences from Production Mint

| Feature | Production | Dev Script |
|---------|-----------|------------|
| IPFS Upload | ✅ Real images/metadata | ❌ Dummy URLs |
| Database Update | ✅ Sets `has_minted=1` | ❌ No DB changes |
| Email Verification | ✅ Required | ❌ Bypassed |
| Wallet Validation | ✅ User's wallet | ❌ Generated test wallet |
| Safety Checks | ✅ All checks | ⚠️ Minimal checks |

## Troubleshooting

### Error: "This script cannot run in production"
**Solution**: Set `NODE_ENV=development` or unset it

### Error: "This script bypasses IPFS"
**Solution**: Run via `npm run dev:mint-all` (includes `SKIP_IPFS_CHECK=true`)

### Error: "PROXY_SEED not configured"
**Solution**: Add proxy seed phrase to `.env.local`

### Error: "Insufficient balance"
**Solution**: Fund the proxy account with DOT

### NFTs minted but not showing in gallery
**Expected**: Database wasn't updated, NFTs only exist on-chain

## Cleanup

To "reset" after running this script:

1. **On-chain**: NFTs are permanent (soulbound), can't be deleted
2. **Database**: No cleanup needed (database wasn't touched)
3. **IPFS**: No cleanup needed (nothing was uploaded)

If you want to test again, you'll need to use a different collection or increment the starting NFT ID.

## See Also

- `test-mint.ts` - Single mint test with real IPFS upload
- `check-proxy-balance.ts` - Check proxy account balance
- `init-db.ts` - Reset database state
