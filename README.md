# Parity 10 Years Anniversary NFT Minting Platform

Next.js application for minting soulbound NFTs to celebrate Parity's 10-year anniversary.

## Quick Start

```bash
npm install
npm run dev
```

## Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete Vercel deployment instructions.

## Features

- Email verification with 6-digit codes
- Whitelist management (Turso database)
- Deterministic 3D NFT generation (12 rarity tiers)
- Polkadot Asset Hub integration (proxy minting)
- Three.js interactive viewer

## Tech Stack

- Next.js 15.5 + TypeScript
- Turso (SQLite for serverless)
- @polkadot/api
- Resend (email)
- Pinata (IPFS)
- Three.js

## Environment Variables

See `.env.example` in root directory.

Required for production:
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`
- `RESEND_API_KEY`
- `PINATA_JWT`
- `RPC_ENDPOINT`
- `COLLECTION_ID`
- `PROXY_SEED`

## Project Structure

```
src/
├── app/              # Next.js routes
│   ├── api/         # API endpoints
│   ├── mint/        # Minting page
│   └── view/        # NFT viewer
├── components/      # React components
└── lib/             # Core logic (mint, db, email)
public/
├── tier-images/     # Static tier previews
└── *.glb            # 3D models
```

## License

MIT
