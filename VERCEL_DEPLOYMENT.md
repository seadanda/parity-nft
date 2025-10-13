# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account** - https://vercel.com
2. **Turso Database** - https://turso.tech (free tier is sufficient)
3. **Resend Account** - https://resend.com (for production emails)
4. **Pinata Account** - https://pinata.cloud (for IPFS pinning)

## Step 1: Prepare New Repository (Recommended)

Create a clean frontend-only repository:

```bash
# Create new directory
mkdir parity-nft-frontend
cd parity-nft-frontend

# Copy frontend contents
cp -r ../parity-nft/frontend/* .
cp ../parity-nft/frontend/.* . 2>/dev/null || true

# Initialize git
git init
git add .
git commit -m "Initial commit - Parity 10Y NFT Minting Platform"

# Create GitHub repo and push
gh repo create parity-nft-frontend --public --source=. --remote=origin --push
```

## Step 2: Set Up Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create parity-nft-prod

# Get connection details
turso db show parity-nft-prod
```

This will output:
- **Database URL**: `libsql://your-db.turso.io`
- **Auth Token**: Generate with `turso db tokens create parity-nft-prod`

### Initialize Database Schema

```bash
# Connect to Turso shell
turso db shell parity-nft-prod

# Run the schema (from scripts/seed-whitelist.js SQL section)
```

Paste the SQL from `scripts/seed-whitelist.js` lines 42-128 (the CREATE TABLE statements).

## Step 3: Deploy to Vercel

### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd parity-nft-frontend
vercel

# Set environment variables (see below)
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
# ... add all other env vars

# Deploy to production
vercel --prod
```

### Option B: Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `.` (if frontend-only repo) or `frontend` (if monorepo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

## Step 4: Configure Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

### Required Variables

```bash
# Blockchain
RPC_ENDPOINT=wss://polkadot-asset-hub-rpc.polkadot.io
COLLECTION_ID=669
PROXY_SEED=your_charlie_seed_phrase_here
COLLECTION_OWNER_ADDRESS=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

# Database (Turso)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# Email (Resend)
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=nft@parity.io
USE_RESEND=true

# IPFS (Pinata)
PINATA_JWT=your_pinata_jwt

# App
APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

### Optional Variables

```bash
# Pinata Group (for organization)
PINATA_GROUP_ID=your_group_id

# JWT Secret (auto-generated if not set)
JWT_SECRET=your_secure_random_string_here
```

## Step 5: Create Static Tier Images

The application uses static preview images instead of Puppeteer. Create these images:

```bash
mkdir -p public/tier-images
```

Generate 12 preview images (one per tier) and save as:
- `public/tier-images/silver.png`
- `public/tier-images/graphite.png`
- `public/tier-images/bronze.png`
- `public/tier-images/copper.png`
- `public/tier-images/emerald.png`
- `public/tier-images/sapphire.png`
- `public/tier-images/green.png`
- `public/tier-images/ruby.png`
- `public/tier-images/gold.png`
- `public/tier-images/magenta.png`
- `public/tier-images/obelisk.png`
- `public/tier-images/obelisk-ultra.png`

**How to generate**: Use the local viewer at `http://localhost:8000?tier=Silver` for each tier, take screenshots, and save as PNG files.

## Step 6: Import Whitelist

Load your whitelist data into Turso:

```bash
# Connect to Turso
turso db shell parity-nft-prod

# Import whitelist (adjust SQL as needed)
INSERT INTO whitelist (email, tier_override) VALUES
  ('user1@example.com', NULL),
  ('user2@example.com', 'Gold'),
  -- ... more entries
;
```

Or use the import script:
```bash
# Set Turso env vars locally
export TURSO_DATABASE_URL=libsql://your-db.turso.io
export TURSO_AUTH_TOKEN=your_token

# Run import
npm run whitelist:import
```

## Step 7: Verify Deployment

1. **Check build logs** in Vercel dashboard
2. **Test email verification** at `/mint`
3. **Test minting flow** with a whitelisted email
4. **Verify Turso connection**:
   ```bash
   turso db shell parity-nft-prod
   SELECT COUNT(*) FROM whitelist;
   SELECT COUNT(*) FROM mint_records;
   ```

## Troubleshooting

### Build Failures

**Error**: `Module not found: Can't resolve 'puppeteer'`
- **Fix**: Ensure `puppeteer` and `better-sqlite3` are removed from `package.json`

**Error**: `Turbopack build failed`
- **Fix**: Remove `--turbopack` flag from build command in `package.json`

### Runtime Errors

**Error**: `Database connection failed`
- **Fix**: Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set in Vercel

**Error**: `Email sending failed`
- **Fix**:
  - Verify `RESEND_API_KEY` is set
  - Ensure `FROM_EMAIL` domain is verified in Resend
  - Set `USE_RESEND=true`

**Error**: `RPC connection timeout`
- **Fix**: Verify `RPC_ENDPOINT` is accessible from Vercel region
- Consider using a backup RPC: `wss://rpc-asset-hub-polkadot.luckyfriday.io`

### Database Issues

**Error**: `Table does not exist`
- **Fix**: Run the schema SQL in Turso shell (Step 2)

**Error**: `UNIQUE constraint failed: whitelist.email`
- **Fix**: Email already exists in whitelist table

## Monitoring

- **Vercel Logs**: https://vercel.com/dashboard → Project → Deployments → View Function Logs
- **Turso Logs**: `turso db inspect parity-nft-prod`
- **Resend Logs**: https://resend.com/emails

## Security Notes

1. **Never commit** `.env` or `.env.local` files
2. **Rotate secrets** regularly (JWT_SECRET, API keys)
3. **Use Vercel's Preview Deployments** for testing before production
4. **Enable Vercel Protection** to prevent unauthorized access during testing
5. **Monitor rate limits** in Turso, Resend, and Pinata dashboards

## Cost Estimates (per 1000 mints)

- **Vercel**: Free tier supports ~100k serverless function invocations/month
- **Turso**: Free tier includes 9GB storage + 1B row reads
- **Resend**: Free tier includes 3,000 emails/month
- **Pinata**: Free tier includes 1GB storage + 100k requests/month

**Total estimated cost for 1000 mints**: $0 (within free tiers)

## Support

- Vercel Issues: https://vercel.com/support
- Turso Discord: https://discord.gg/turso
- Resend Support: support@resend.com
