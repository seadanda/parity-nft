# Proxy Account Balance Monitoring

The proxy account needs sufficient DOT balance to mint NFTs. This document explains how balance checking works and how to monitor it.

## Overview

The minting service uses a **proxy account** (Charlie) to mint NFTs on behalf of the collection owner (Bob). Every mint operation requires:
- Transaction fees (~0.01-0.02 DOT)
- Storage deposits for NFT metadata
- Gas for batch operations

## Balance Thresholds

| Threshold | Value | Action |
|-----------|-------|--------|
| **Minimum Balance** | 0.5 DOT | Minting will fail if below this |
| **Low Balance Warning** | 2.0 DOT | Warning logged, but minting continues |
| **Recommended Balance** | 5+ DOT | Comfortable buffer for ~250 mints |

## Balance Checking

### Before Every Mint

The system automatically checks the proxy account balance before attempting to mint:

```typescript
// In src/lib/mint.ts
// 1. Check balance
// 2. If < 0.5 DOT → Throw error (minting fails gracefully)
// 3. If < 2.0 DOT → Log warning (minting continues)
// 4. Log balance to console
```

### Manual Balance Check

Check the current balance anytime with:

```bash
npm run proxy:balance
```

**Example output:**
```
🔍 Checking proxy account balance...

Proxy Address: 5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y

==========================================
💰 Balance Information
==========================================
Free Balance:     5.2340 DOT
Reserved Balance: 0.1200 DOT
Total Balance:    5.3540 DOT
==========================================

✅ Balance is sufficient for minting

📊 Estimates:
   Estimated cost per mint: ~0.02 DOT
   Possible mints remaining: ~261
```

## Error Handling

### When Balance is Too Low

**Backend behavior:**
1. Balance check fails before minting starts
2. Error thrown: `INSUFFICIENT_PROXY_BALANCE`
3. Logged as critical error with details

**API Response:**
```json
{
  "success": false,
  "error": "PROXY_BALANCE_TOO_LOW",
  "message": "The minting service is temporarily unavailable due to insufficient funds. Please contact support.",
  "details": "Proxy account has insufficient funds (0.32 DOT). Please top up the proxy account."
}
```

**Frontend behavior:**
- Shows user-friendly error message
- Status set to "error"
- Suggests contacting support

### When Balance is Low (but sufficient)

**Backend behavior:**
1. Warning logged to console
2. Minting continues normally

**Log output:**
```
[mint] ⚠️  WARNING: Proxy account balance is low: 1.5000 DOT. Consider topping up soon.
```

## Monitoring in Production

### Vercel Logs

Monitor balance warnings in Vercel logs:

1. Go to Vercel Dashboard → Your Project → Logs
2. Filter for: `[mint] ⚠️  WARNING`
3. Set up alerts for critical errors

### Log Patterns

**Normal operation:**
```
[mint] Proxy account 5FLSigC...S59Y balance: 5.2340 DOT
```

**Low balance warning:**
```
[mint] ⚠️  WARNING: Proxy account balance is low: 1.5000 DOT. Consider topping up soon.
```

**Critical error:**
```
[mint] ❌ CRITICAL: Proxy account balance too low: 0.32 DOT (minimum: 0.5 DOT)
```

## Topping Up the Proxy Account

### Get the Proxy Address

```bash
npm run proxy:balance
```

The address will be shown at the top of the output.

### Transfer DOT

1. Open Polkadot.js Apps: https://polkadot.js.org/apps/
2. Connect to Polkadot Asset Hub
3. Navigate to Accounts → Transfer
4. Send DOT to the proxy address
5. Recommended amount: **5-10 DOT**

### Verify Balance

After transferring:
```bash
npm run proxy:balance
```

## Cost Estimation

Based on testing:
- **Per mint**: ~0.02 DOT (varies by network congestion)
- **For 200 mints**: ~4 DOT + buffer
- **Recommended**: 5-10 DOT for comfortable operation

### Breakdown per mint:
- Transaction fees: ~0.005-0.01 DOT
- Metadata storage: ~0.005 DOT
- Batch operation overhead: ~0.005 DOT
- **Total**: ~0.015-0.02 DOT

## Setting Up Alerts

### Option 1: Vercel Log Drains

Set up Vercel log drains to external monitoring:
1. Vercel Dashboard → Project Settings → Log Drains
2. Add integration (DataDog, Sentry, etc.)
3. Configure alerts for `CRITICAL` and `WARNING` patterns

### Option 2: Custom Monitoring Script

Create a cron job to check balance periodically:

```bash
# Every hour
0 * * * * cd /path/to/project && npm run proxy:balance >> /var/log/proxy-balance.log 2>&1
```

### Option 3: Balance Check API

Add a monitoring endpoint (optional):

```typescript
// src/app/api/admin/balance/route.ts
export async function GET(request: NextRequest) {
  // Check auth
  // Run balance check
  // Return JSON with balance status
}
```

## Troubleshooting

### "PROXY_SEED not set in environment variables"

Ensure `.env.local` or Vercel environment variables include:
```bash
PROXY_SEED="your_seed_phrase_here"
RPC_ENDPOINT="wss://polkadot-asset-hub-rpc.polkadot.io"
```

### "Could not check proxy account balance"

This is a non-fatal warning. Possible causes:
- RPC endpoint temporarily unavailable
- Network connectivity issues
- Minting will continue (balance check is opportunistic)

### Balance showing 0.0000 DOT

1. Verify correct proxy seed phrase
2. Check you're connected to the right network (Asset Hub, not Relay Chain)
3. Confirm address has been funded

## Security Notes

- **Never commit** `PROXY_SEED` to version control
- Store `PROXY_SEED` only in Vercel environment variables (encrypted)
- Use a dedicated proxy account (not a personal wallet)
- Recommended: Use a hardware wallet for the collection owner (Bob)
- The proxy has limited permissions (AssetManager only)

## Production Checklist

Before going live:

- [ ] Proxy account has 5+ DOT balance
- [ ] `npm run proxy:balance` works correctly
- [ ] Low balance warnings appear in logs
- [ ] Insufficient balance error tested and works
- [ ] Frontend shows correct error message
- [ ] Monitoring/alerts configured
- [ ] Team knows how to top up the account

## Questions?

- **How often should I check?**: During active minting, check daily
- **What if I forget to top up?**: Minting will fail gracefully with clear error
- **Can users still verify emails?**: Yes, only minting is blocked
- **How do I know when it's urgent?**: Monitor for CRITICAL errors in logs

---

**Related Documentation:**
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database configuration
- [README.md](./README.md) - General project overview
