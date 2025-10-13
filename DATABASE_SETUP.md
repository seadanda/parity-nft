# Database Setup Guide

This project uses **Turso** (libSQL) for both local development and production. The database setup is unified using `@libsql/client`.

## Table of Contents

- [Overview](#overview)
- [Environment Configuration](#environment-configuration)
- [Database Schema](#database-schema)
- [Setup Workflow](#setup-workflow)
- [Managing the Whitelist](#managing-the-whitelist)
- [Viewing the Database](#viewing-the-database)
- [Available Scripts](#available-scripts)

---

## Overview

**Database Client**: `@libsql/client` (compatible with both local SQLite and Turso)

**Tables**:
- `whitelist` - Approved email addresses for minting
- `verification_codes` - Email verification codes (6-digit)
- `sessions` - User sessions after successful verification
- `mint_records` - Tracks which emails have minted NFTs
- `rate_limits` - Rate limiting for API endpoints
- `audit_log` - Audit trail of all actions

---

## Environment Configuration

### Local Development (SQLite)

Leave `TURSO_DATABASE_URL` unset or commented out in `.env.local`:

```bash
# TURSO_DATABASE_URL=""  # Comment out or leave empty
# TURSO_AUTH_TOKEN=""     # Comment out or leave empty
```

The app will automatically use: `file:./data/whitelist.sqlite`

### Production (Turso)

Set both variables in `.env.local` or `.env.production`:

```bash
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your_auth_token_here"
```

**How it works**: [src/lib/db.ts](src/lib/db.ts) checks if `TURSO_DATABASE_URL` is set:
- If **set** → connects to Turso
- If **empty** → uses local SQLite file

---

## Database Schema

All tables are automatically created by the initialization script. Here's the full schema:

### whitelist
```sql
CREATE TABLE whitelist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  category TEXT,
  notes TEXT,
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by TEXT
);
CREATE INDEX idx_whitelist_email ON whitelist(email);
```

### verification_codes
```sql
CREATE TABLE verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  ip_address TEXT,
  user_agent TEXT
);
CREATE INDEX idx_codes_email ON verification_codes(email);
CREATE INDEX idx_codes_expires ON verification_codes(expires_at);
```

### sessions
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  last_activity TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_email ON sessions(email);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

### mint_records
```sql
CREATE TABLE mint_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  collection_id INTEGER NOT NULL,
  nft_id INTEGER NOT NULL,
  hash TEXT NOT NULL,
  tier TEXT NOT NULL,
  rarity TEXT NOT NULL,
  transaction_hash TEXT,
  minted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_ipfs TEXT,
  image_ipfs TEXT
);
CREATE INDEX idx_mints_email ON mint_records(email);
CREATE INDEX idx_mints_wallet ON mint_records(wallet_address);
CREATE INDEX idx_mints_nft ON mint_records(collection_id, nft_id);
CREATE INDEX idx_mints_hash ON mint_records(hash);
```

### rate_limits
```sql
CREATE TABLE rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL,
  action TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until TEXT
);
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, action);
CREATE INDEX idx_rate_limits_locked ON rate_limits(locked_until);
```

### audit_log
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action TEXT NOT NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success INTEGER NOT NULL,
  error_message TEXT,
  metadata TEXT
);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_email ON audit_log(email);
CREATE INDEX idx_audit_action ON audit_log(action);
```

---

## Setup Workflow

### Initial Setup (Production/Turso)

```bash
# 1. Initialize database schema (creates all tables)
npm run db:init

# 2. Import the whitelist file (196 Parity emails)
npm run whitelist:import

# 3. (Optional) Add test users for development
npm run db:seed
```

### Reset Database (⚠️ Destructive)

```bash
# Drop all tables and recreate schema
npm run db:init:drop

# Then re-import whitelist
npm run whitelist:import
```

---

## Managing the Whitelist

### Add a Single Email

```bash
# Basic usage
npm run whitelist:add user@example.com

# With name
npm run whitelist:add user@example.com "John Doe"

# With name and category
npm run whitelist:add user@example.com "John Doe" "VIP"
```

**Script**: [scripts/add-to-whitelist.ts](scripts/add-to-whitelist.ts)

**Features**:
- Validates email format
- Checks if already whitelisted (prevents duplicates)
- Works with both local SQLite and Turso
- Safe for production use

### Bulk Import from File

To import multiple emails, create a text file with one email per line (like the existing `whitelist` file):

```bash
npm run whitelist:import
```

**Default file**: `/whitelist` (root directory)

**Script**: [scripts/import-whitelist.ts](scripts/import-whitelist.ts)

**Features**:
- Auto-adds `@parity.io` if domain missing
- Skips duplicates gracefully
- Shows detailed import summary

---

## Viewing the Database

### Option 1: Turso Web Console (Recommended)

1. Go to https://turso.tech/
2. Log in to your account
3. Select your database: `database-yellow-window-vercel-icfg`
4. Click **"SQL Console"** or **"Shell"**
5. Run queries directly in the browser

**Example queries**:

```sql
-- View all whitelisted emails
SELECT email, name, category, added_at FROM whitelist ORDER BY added_at DESC;

-- Check how many have minted
SELECT
  COUNT(*) as total_whitelisted,
  (SELECT COUNT(*) FROM mint_records) as total_minted
FROM whitelist;

-- View recent mints
SELECT
  email,
  wallet_address,
  tier,
  rarity,
  minted_at
FROM mint_records
ORDER BY minted_at DESC
LIMIT 10;

-- Audit recent actions
SELECT
  timestamp,
  action,
  email,
  success
FROM audit_log
ORDER BY timestamp DESC
LIMIT 20;
```

### Option 2: Local SQLite (Development)

If running locally (no `TURSO_DATABASE_URL` set):

```bash
# Using sqlite3 CLI
sqlite3 data/whitelist.sqlite

# Or use TablePlus
# Connection Type: SQLite
# Path: /Users/donal/dev/parity-nft/data/whitelist.sqlite
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run db:init` | Initialize database schema (preserves data) |
| `npm run db:init:drop` | Drop and recreate all tables (⚠️ destructive) |
| `npm run db:seed` | Add test users for development |
| `npm run whitelist:import` | Import emails from `whitelist` file |
| `npm run whitelist:add <email>` | Add a single email to whitelist |
| `npm run test:email` | Test email flow |

---

## Migration from Other Databases

### Previous Setup Issues (Resolved)

The project previously had:
- ❌ `seed-whitelist.js` using `better-sqlite3` (not installed)
- ❌ Schema mismatches between scripts
- ❌ Mixed database clients

### Current Setup

- ✅ All scripts use `@libsql/client`
- ✅ Unified schema across all scripts
- ✅ Works seamlessly with both local and Turso
- ✅ No `better-sqlite3` dependency needed

---

## Troubleshooting

### "Database locked" error

If you get a database locked error (local SQLite only):
```bash
# Close any open connections
rm data/whitelist.sqlite-wal
rm data/whitelist.sqlite-shm
```

### Can't connect to Turso

1. Check `.env.local` has both variables set:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
2. Verify token hasn't expired
3. Check database exists in Turso console

### Schema out of sync

If you suspect schema issues:
```bash
# Reset everything
npm run db:init:drop
npm run whitelist:import
```

---

## Production Checklist

Before deploying:

- [ ] Turso database created
- [ ] `TURSO_DATABASE_URL` set in Vercel environment variables
- [ ] `TURSO_AUTH_TOKEN` set in Vercel environment variables
- [ ] Database initialized: `npm run db:init`
- [ ] Whitelist imported: `npm run whitelist:import`
- [ ] Test email flow works
- [ ] Verify in Turso web console

---

## Security Notes

- All emails are stored in **lowercase**
- Rate limiting prevents abuse
- Audit log tracks all actions
- Sessions expire after 4 hours
- Verification codes expire after 10 minutes
- Only ONE active verification code per email at a time

---

## Support

For issues or questions:
- Check Turso web console for live data
- Review audit logs for debugging
- Test locally first (comment out Turso vars)
