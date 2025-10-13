#!/usr/bin/env tsx
/**
 * Database Migration: Privacy Updates
 *
 * Changes:
 * 1. Add UNIQUE constraint to verification_codes.email
 * 2. Remove email column from mint_records table
 *
 * This script safely migrates existing data.
 */

import { createClient, type Client } from '@libsql/client';

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

async function migrateDatabase() {
  const db = getDbClient();

  try {
    console.log('🔄 Starting database migration for privacy updates...\n');

    // Step 1: Fix verification_codes table
    console.log('📝 Step 1: Migrating verification_codes table...');

    // Create new table with UNIQUE constraint
    await db.execute(`
      CREATE TABLE IF NOT EXISTS verification_codes_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        ip_address TEXT,
        user_agent TEXT
      )
    `);

    // Copy data (only keeping the most recent code per email)
    await db.execute(`
      INSERT INTO verification_codes_new (id, email, code, created_at, expires_at, used_at, ip_address, user_agent)
      SELECT id, email, code, created_at, expires_at, used_at, ip_address, user_agent
      FROM verification_codes
      WHERE id IN (
        SELECT MAX(id) FROM verification_codes GROUP BY LOWER(email)
      )
    `);

    // Drop old table and rename new one
    await db.execute('DROP TABLE IF EXISTS verification_codes');
    await db.execute('ALTER TABLE verification_codes_new RENAME TO verification_codes');

    // Recreate indexes
    await db.execute('CREATE INDEX IF NOT EXISTS idx_codes_email ON verification_codes(email)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_codes_expires ON verification_codes(expires_at)');

    console.log('  ✅ verification_codes table migrated (now has UNIQUE constraint on email)');

    // Step 2: Fix mint_records table
    console.log('\n📝 Step 2: Migrating mint_records table...');

    // Create new table without email column
    await db.execute(`
      CREATE TABLE IF NOT EXISTS mint_records_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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

    // Copy data WITHOUT email column
    await db.execute(`
      INSERT INTO mint_records_new (id, wallet_address, collection_id, nft_id, hash, tier, rarity, transaction_hash, minted_at, metadata_ipfs, image_ipfs)
      SELECT id, wallet_address, collection_id, nft_id, hash, tier, rarity, transaction_hash, minted_at, metadata_ipfs, image_ipfs
      FROM mint_records
    `);

    // Drop old table and rename new one
    await db.execute('DROP TABLE IF EXISTS mint_records');
    await db.execute('ALTER TABLE mint_records_new RENAME TO mint_records');

    // Recreate indexes (without email index)
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mints_wallet ON mint_records(wallet_address)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mints_nft ON mint_records(collection_id, nft_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mints_hash ON mint_records(hash)');

    console.log('  ✅ mint_records table migrated (email column removed for privacy)');

    console.log('\n✅ Database migration completed successfully!\n');
    console.log('Summary of changes:');
    console.log('  • verification_codes: Added UNIQUE constraint on email');
    console.log('  • verification_codes: Only kept most recent code per email');
    console.log('  • mint_records: Removed email column for user privacy');
    console.log('');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

migrateDatabase();
