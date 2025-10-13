# Standalone Repository Setup Guide

This guide explains how to extract the `frontend/` directory into a standalone repository for Vercel deployment.

## Summary of Changes Made

The frontend directory has been prepared to work as a standalone repository with the following changes:

1. ✅ **Database path fixed**: Changed from `file:../data/whitelist.sqlite` to `file:./data/whitelist.sqlite`
2. ✅ **Scripts copied**: All utility scripts moved from `../scripts/` to `./scripts/`
3. ✅ **Environment variables**: Complete `.env.example` created
4. ✅ **Dependencies**: Removed `puppeteer` and `better-sqlite3`, using Turso instead
5. ✅ **Build configuration**: Turbopack root set, standard webpack build for Vercel
6. ✅ **Turso integration**: Database client supports both local SQLite and Turso

## No External References

The frontend directory has **zero dependencies** on files outside its folder:

- ❌ No `../../` imports
- ❌ No references to parent `package.json`
- ❌ No scripts referencing parent directories
- ✅ All scripts in `./scripts/`
- ✅ All dependencies in `./package.json`
- ✅ Database path relative to frontend root

## Step-by-Step: Create Standalone Repo

### Option 1: Fresh Clone (Recommended)

```bash
# 1. Create new directory
mkdir parity-nft-frontend
cd parity-nft-frontend

# 2. Copy frontend contents
cp -r /path/to/parity-nft/frontend/* .
cp /path/to/parity-nft/frontend/.* . 2>/dev/null || true

# 3. Remove unwanted files
rm -rf .next node_modules
rm .env  # Will create new one

# 4. Create production .env.local
cp .env.example .env.local
# Edit .env.local with production values

# 5. Initialize git
git init
git add .
git commit -m "Initial commit: Parity 10Y NFT Frontend"

# 6. Create GitHub repo
gh repo create parity-nft-frontend --public --source=. --remote=origin --push
```

### Option 2: Git Subtree (Advanced)

```bash
# Extract frontend as standalone repo with history
cd /path/to/parity-nft
git subtree split --prefix=frontend -b frontend-only

# Create new repo
mkdir ../parity-nft-frontend
cd ../parity-nft-frontend
git init
git pull ../parity-nft frontend-only
git remote add origin git@github.com:yourorg/parity-nft-frontend.git
git push -u origin main
```

## Local Development Test

After creating the standalone repo, verify it works:

```bash
cd parity-nft-frontend

# 1. Install dependencies
npm install

# 2. Create data directory for local SQLite
mkdir -p data

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with local development values

# 4. Seed database
npm run db:reset

# 5. Start dev server
npm run dev
```

Visit http://localhost:3000 - it should work without any parent directory references!

## Vercel Deployment

Once the standalone repo is created:

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Set environment variables
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add RESEND_API_KEY
vercel env add PINATA_JWT
vercel env add RPC_ENDPOINT
vercel env add COLLECTION_ID
vercel env add PROXY_SEED
vercel env add COLLECTION_OWNER_ADDRESS
vercel env add FROM_EMAIL
vercel env add APP_URL
vercel env add USE_RESEND

# 5. Deploy
vercel --prod
```

Or use Vercel Dashboard:
1. Import GitHub repository
2. Framework: Next.js (auto-detected)
3. Root Directory: `.` (leave default)
4. Add environment variables in Settings → Environment Variables
5. Deploy!

## Required Environment Variables for Production

See `.env.example` for all variables. Minimum required:

```bash
# Blockchain
RPC_ENDPOINT=wss://polkadot-asset-hub-rpc.polkadot.io
COLLECTION_ID=669
PROXY_SEED=your_proxy_seed
COLLECTION_OWNER_ADDRESS=5GrwvaEF...

# Database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token

# Email
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=nft@parity.io
USE_RESEND=true

# IPFS
PINATA_JWT=your_jwt

# App
APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

## Directory Structure (Standalone)

```
parity-nft-frontend/
├── .env.example              # Environment template
├── .env.local                # Local config (gitignored)
├── .gitignore
├── .vercelignore
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vercel.json
├── README.md
├── VERCEL_DEPLOYMENT.md
├── STANDALONE_SETUP.md       # This file
├── data/                     # Local SQLite (created on first run)
│   └── whitelist.sqlite
├── public/
│   ├── tier-images/          # Static tier preview images
│   ├── *.js                  # Three.js dependencies
│   ├── *.glb                 # 3D models
│   └── *.hdr                 # HDR environment maps
├── scripts/
│   ├── seed-whitelist.js     # Database seeding
│   ├── import-whitelist.ts   # CSV import
│   └── test-email-flow.ts    # Email testing
└── src/
    ├── app/                  # Next.js App Router
    │   ├── api/             # API routes
    │   ├── mint/            # Minting page
    │   ├── view/            # NFT viewer
    │   └── how-it-works/    # Info page
    ├── components/          # React components
    │   ├── EmailVerification.tsx
    │   ├── MintForm.tsx
    │   ├── TierViewer.tsx
    │   └── ui/
    └── lib/                 # Core logic
        ├── mint.ts          # Minting
        ├── db.ts            # Database (Turso)
        ├── email.ts         # Email service
        └── validation.ts    # Validation
```

## Files to Add to New Repo

All files in `frontend/` should be included **except**:

```
# Already in .gitignore
node_modules/
.next/
.env
.env.local
data/*.sqlite*
```

## Verification Checklist

After creating standalone repo, verify:

- [ ] `npm install` works without errors
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts dev server
- [ ] `npm run db:reset` creates local database
- [ ] No imports reference `../` outside frontend
- [ ] All scripts in `./scripts/` directory
- [ ] `.env.example` contains all required variables
- [ ] README.md documents the standalone setup
- [ ] Vercel deployment succeeds

## Troubleshooting

### Error: "Cannot find module '../data/whitelist'"
- **Fix**: Database path already updated to `./data/whitelist.sqlite`
- **Verify**: Check `src/lib/db.ts` line 17

### Error: "Module not found: '../scripts/'"
- **Fix**: Scripts already copied to `./scripts/`
- **Verify**: Check `ls scripts/`

### Error: "Multiple lockfiles detected"
- **Fix**: Turbopack root already set in `next.config.ts`
- **Verify**: Check `experimental.turbo.root` in config

### Error: "puppeteer not found"
- **Fix**: Already removed from package.json
- **Verify**: Image generation uses static files now

## Support

For deployment issues:
- Vercel: See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- Turso: https://docs.turso.tech
- General: Check README.md

## Summary

The frontend is now a **fully self-contained, deployment-ready** Next.js application with:

✅ No external dependencies
✅ Turso database integration
✅ Vercel-optimized build
✅ Complete documentation
✅ All scripts included
✅ Production-ready configuration

You can safely copy this directory to a new repo and deploy to Vercel without any modifications!
