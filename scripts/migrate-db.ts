/**
 * Database Migration Script
 *
 * Adds the new columns needed for the minting state machine:
 * - minting_state: Tracks current state (idle/minting/completed/failed)
 * - minting_started_at: Timestamp when minting started (for timeout detection)
 *
 * Safe to run multiple times - will skip if columns already exist.
 *
 * Usage:
 *   tsx scripts/migrate-db.ts
 */

import { createClient } from '@libsql/client';
import 'dotenv/config';

async function migrateDatabase() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  let db;

  if (!url) {
    // Fallback to local SQLite for development (same path as db.ts)
    console.log('🔗 Using local SQLite database: ./data/whitelist.sqlite');
    db = createClient({
      url: 'file:./data/whitelist.sqlite'
    });
  } else {
    console.log('🔗 Connecting to database:', url.split('@')[1] || url);
    db = createClient({
      url,
      authToken
    });
  }

  try {
    console.log('\n📊 Checking current schema...');

    // Check current columns
    const columns = await db.execute(`PRAGMA table_info(whitelist)`);
    const columnNames = columns.rows.map((row: any) => row.name);

    console.log('Current columns:', columnNames.join(', '));

    // Migration 1: Add minting_state column
    if (!columnNames.includes('minting_state')) {
      console.log('\n➕ Adding minting_state column...');
      await db.execute(`
        ALTER TABLE whitelist
        ADD COLUMN minting_state TEXT NOT NULL DEFAULT 'idle'
      `);
      console.log('✅ Added minting_state column');
    } else {
      console.log('✓ minting_state column already exists');
    }

    // Migration 2: Add minting_started_at column
    if (!columnNames.includes('minting_started_at')) {
      console.log('\n➕ Adding minting_started_at column...');
      await db.execute(`
        ALTER TABLE whitelist
        ADD COLUMN minting_started_at TEXT
      `);
      console.log('✅ Added minting_started_at column');
    } else {
      console.log('✓ minting_started_at column already exists');
    }

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const updatedColumns = await db.execute(`PRAGMA table_info(whitelist)`);
    const updatedColumnNames = updatedColumns.rows.map((row: any) => row.name);

    const requiredColumns = ['minting_state', 'minting_started_at'];
    const missing = requiredColumns.filter(col => !updatedColumnNames.includes(col));

    if (missing.length > 0) {
      console.error('❌ Migration incomplete! Missing columns:', missing.join(', '));
      process.exit(1);
    }

    console.log('✅ All required columns present!');

    // Show sample data
    console.log('\n📋 Sample whitelist data:');
    const sample = await db.execute(`
      SELECT email, has_minted, minting_state, minting_started_at
      FROM whitelist
      LIMIT 3
    `);

    if (sample.rows.length > 0) {
      console.table(sample.rows);
    } else {
      console.log('(No data in whitelist table)');
    }

    // Check for any stuck states that need cleanup
    console.log('\n🔍 Checking for stuck minting states...');
    const stuckStates = await db.execute(`
      SELECT
        email,
        minting_state,
        minting_started_at
      FROM whitelist
      WHERE minting_state = 'minting'
        AND datetime(minting_started_at, '+10 minutes') < datetime('now')
    `);

    if (stuckStates.rows.length > 0) {
      console.log(`⚠️  Found ${stuckStates.rows.length} stuck minting states:`);
      console.table(stuckStates.rows);
      console.log('\n💡 Run the cleanup endpoint to resolve these:');
      console.log('   curl "https://your-app.com/api/cleanup?key=YOUR_SECRET"');
    } else {
      console.log('✅ No stuck states found');
    }

    console.log('\n✨ Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration
migrateDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
