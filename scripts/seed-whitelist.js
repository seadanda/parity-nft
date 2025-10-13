#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/whitelist.sqlite');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldReset = args.includes('--reset') || args.includes('--overwrite') || args.includes('-r');

if (shouldReset) {
  console.log('🗑️  Resetting database...\n');

  // Close any existing connections and delete the database file
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('✅ Deleted existing database\n');
  }

  // Also clean up WAL and SHM files if they exist
  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;

  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
  }
  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
  }
}

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 Created data directory\n');
}

const db = new Database(DB_PATH);

// Initialize ALL tables (complete schema)
console.log('📋 Initializing database schema...\n');

db.exec(`
  -- Whitelist table
  CREATE TABLE IF NOT EXISTS whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    category TEXT,
    notes TEXT,
    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_whitelist_email ON whitelist(email);

  -- Verification codes table
  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    ip_address TEXT,
    user_agent TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_codes_email ON verification_codes(email);
  CREATE INDEX IF NOT EXISTS idx_codes_expires ON verification_codes(expires_at);

  -- Sessions table
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
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

  -- Mint records table - tracks which emails have minted
  CREATE TABLE IF NOT EXISTS mint_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    wallet_address TEXT NOT NULL,
    minted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_mints_email ON mint_records(email);

  -- Rate limits table
  CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    identifier_type TEXT NOT NULL,
    action TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1,
    window_start TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_until TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action);
  CREATE INDEX IF NOT EXISTS idx_rate_limits_locked ON rate_limits(locked_until);

  -- Audit log table
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
  );
  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
  CREATE INDEX IF NOT EXISTS idx_audit_email ON audit_log(email);
  CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
`);

console.log('✅ Schema initialized\n');

// Test emails to seed
const testEmails = [
  { email: 'donal.murray@parity.io', name: 'Donal Murray (Owner)' },
  { email: 'test@parity.io', name: 'Test User' },
  { email: 'alice@example.com', name: 'Alice' },
  { email: 'bob@example.com', name: 'Bob' },
  { email: 'charlie@example.com', name: 'Charlie' },
  { email: 'dave@example.com', name: 'Dave' },
];

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO whitelist (email, name, category, notes)
  VALUES (?, ?, 'test', 'Seeded for local testing')
`);

console.log('🌱 Seeding whitelist...\n');

let added = 0;
let skipped = 0;

testEmails.forEach(({ email, name }) => {
  const result = insertStmt.run(email, name);
  if (result.changes > 0) {
    console.log('  ✅ Added:', email);
    added++;
  } else {
    console.log('  ⏭️  Skipped (exists):', email);
    skipped++;
  }
});

const count = db.prepare('SELECT COUNT(*) as count FROM whitelist').get();
console.log(`\n📊 Summary:`);
console.log(`  • Added: ${added}`);
console.log(`  • Skipped: ${skipped}`);
console.log(`  • Total whitelisted emails: ${count.count}`);

db.close();
console.log('\n✅ Database seeded successfully!');
console.log('\n💡 Usage:');
console.log('  • Seed without reset:  node scripts/seed-whitelist.js');
console.log('  • Reset and seed:      node scripts/seed-whitelist.js --reset');
