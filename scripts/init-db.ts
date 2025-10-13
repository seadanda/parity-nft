#!/usr/bin/env tsx
/**
 * Initialize database with all required tables
 * Works with both local SQLite and Turso
 *
 * Usage:
 *   npm run db:init        # Initialize schema
 *   npm run db:init --drop # Drop and recreate all tables
 */

import { createClient, type Client } from '@libsql/client';

const args = process.argv.slice(2);
const shouldDrop = args.includes('--drop') || args.includes('--reset');

function getDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.log('📁 Using local SQLite: file:./data/whitelist.sqlite\n');
    return createClient({
      url: 'file:./data/whitelist.sqlite'
    });
  } else {
    console.log('☁️  Using Turso database:', url, '\n');
    return createClient({
      url,
      authToken
    });
  }
}

async function initializeDatabase() {
  const db = getDbClient();

  try {
    console.log('🗄️  Initializing database schema...\n');

    if (shouldDrop) {
      console.log('⚠️  Dropping existing tables...\n');

      const tables = [
        'audit_log',
        'rate_limits',
        'mint_records',
        'sessions',
        'verification_codes',
        'whitelist'
      ];

      for (const table of tables) {
        try {
          await db.execute(`DROP TABLE IF EXISTS ${table}`);
          console.log(`  ✅ Dropped table: ${table}`);
        } catch (err) {
          console.log(`  ⚠️  Could not drop ${table}:`, err);
        }
      }
      console.log('');
    }

    // Whitelist table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS whitelist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        category TEXT,
        notes TEXT,
        added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        added_by TEXT
      )
    `);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_whitelist_email ON whitelist(email)');
    console.log('✅ whitelist table');

    // Verification codes table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        ip_address TEXT,
        user_agent TEXT
      )
    `);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_codes_email ON verification_codes(email)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_codes_expires ON verification_codes(expires_at)');
    console.log('✅ verification_codes table');

    // Sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        last_activity TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        is_active INTEGER NOT NULL DEFAULT 1
      )
    `);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)');
    console.log('✅ sessions table');

    // Mint records table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS mint_records (
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
      )
    `);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mints_email ON mint_records(email)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mints_wallet ON mint_records(wallet_address)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mints_nft ON mint_records(collection_id, nft_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mints_hash ON mint_records(hash)');
    console.log('✅ mint_records table');

    // Rate limits table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL,
        identifier_type TEXT NOT NULL,
        action TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 1,
        window_start TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        locked_until TEXT
      )
    `);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_rate_limits_locked ON rate_limits(locked_until)');
    console.log('✅ rate_limits table');

    // Audit log table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        action TEXT NOT NULL,
        email TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success INTEGER NOT NULL,
        error_message TEXT,
        metadata TEXT
      )
    `);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_audit_email ON audit_log(email)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action)');
    console.log('✅ audit_log table');

    console.log('\n✅ Database schema initialized successfully!\n');
    console.log('📝 Next steps:');
    console.log('  • Run: npm run whitelist:import   (import whitelist file)');
    console.log('  • Run: npm run db:seed            (add test users)');
    console.log('');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
