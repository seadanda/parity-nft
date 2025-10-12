// Database setup and queries for whitelist system
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), '../data/whitelist.sqlite');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeTables();
  }
  return db;
}

function initializeTables() {
  const db = getDb();

  // Whitelist table
  db.exec(`
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
  `);

  // Verification codes table
  db.exec(`
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
  `);

  // Sessions table
  db.exec(`
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
  `);

  // Mint records table
  db.exec(`
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
    );
    CREATE INDEX IF NOT EXISTS idx_mints_email ON mint_records(email);
    CREATE INDEX IF NOT EXISTS idx_mints_wallet ON mint_records(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_mints_nft ON mint_records(collection_id, nft_id);
    CREATE INDEX IF NOT EXISTS idx_mints_hash ON mint_records(hash);
  `);

  // Rate limits table
  db.exec(`
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
  `);

  // Audit log table
  db.exec(`
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
}

// Whitelist queries
export function isEmailWhitelisted(email: string): boolean {
  const db = getDb();
  const stmt = db.prepare('SELECT 1 FROM whitelist WHERE LOWER(email) = LOWER(?) LIMIT 1');
  return !!stmt.get(email);
}

export function getWhitelistEntry(email: string) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM whitelist WHERE LOWER(email) = LOWER(?)');
  return stmt.get(email);
}

export function getAllWhitelist() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT w.*,
           m.nft_id,
           m.minted_at,
           CASE WHEN m.email IS NOT NULL THEN 1 ELSE 0 END as has_minted
    FROM whitelist w
    LEFT JOIN mint_records m ON w.email = m.email
    ORDER BY w.added_at DESC
  `);
  return stmt.all();
}

export function addToWhitelist(email: string, name?: string, category?: string, notes?: string) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO whitelist (email, name, category, notes) VALUES (?, ?, ?, ?)'
  );
  return stmt.run(email.toLowerCase(), name, category, notes);
}

// Verification code queries
export function createVerificationCode(email: string, ipAddress: string, userAgent: string): string {
  const db = getDb();
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  const stmt = db.prepare(
    'INSERT INTO verification_codes (email, code, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(email.toLowerCase(), code, expiresAt, ipAddress, userAgent);

  return code;
}

export function verifyCode(email: string, code: string): boolean {
  const db = getDb();

  // Find valid unused code
  const stmt = db.prepare(`
    SELECT id FROM verification_codes
    WHERE LOWER(email) = LOWER(?)
      AND code = ?
      AND used_at IS NULL
      AND expires_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const result = stmt.get(email, code) as { id: number } | undefined;

  if (result) {
    // Mark code as used
    const updateStmt = db.prepare(
      'UPDATE verification_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    updateStmt.run(result.id);
    return true;
  }

  return false;
}

// Session queries
export function createSession(email: string, ipAddress: string, userAgent: string): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours

  const stmt = db.prepare(
    'INSERT INTO sessions (email, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(email.toLowerCase(), token, expiresAt, ipAddress, userAgent);

  return token;
}

export function validateSession(token: string): { email: string; name?: string } | null {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT s.email, w.name
    FROM sessions s
    LEFT JOIN whitelist w ON s.email = w.email
    WHERE s.token = ?
      AND s.is_active = 1
      AND s.expires_at > datetime('now')
    LIMIT 1
  `);

  const result = stmt.get(token) as { email: string; name?: string } | undefined;

  if (result) {
    // Update last activity
    const updateStmt = db.prepare(
      'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = ?'
    );
    updateStmt.run(token);
    return result;
  }

  return null;
}

// Mint record queries
export function hasEmailMinted(email: string): boolean {
  const db = getDb();
  const stmt = db.prepare('SELECT 1 FROM mint_records WHERE LOWER(email) = LOWER(?) LIMIT 1');
  return !!stmt.get(email);
}

export function recordMint(
  email: string,
  walletAddress: string,
  collectionId: number,
  nftId: number,
  hash: string,
  tier: string,
  rarity: string,
  transactionHash?: string
) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO mint_records (
      email, wallet_address, collection_id, nft_id,
      hash, tier, rarity, transaction_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    email.toLowerCase(),
    walletAddress,
    collectionId,
    nftId,
    hash,
    tier,
    rarity,
    transactionHash
  );
}

// Rate limiting queries
export function checkRateLimit(
  identifier: string,
  identifierType: 'email' | 'ip',
  action: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remainingAttempts?: number; lockedUntil?: string } {
  const db = getDb();

  // Check if locked
  const lockStmt = db.prepare(`
    SELECT locked_until FROM rate_limits
    WHERE identifier = ?
      AND identifier_type = ?
      AND action = ?
      AND locked_until > datetime('now')
    LIMIT 1
  `);

  const lockResult = lockStmt.get(identifier, identifierType, action) as { locked_until: string } | undefined;

  if (lockResult) {
    return {
      allowed: false,
      lockedUntil: lockResult.locked_until
    };
  }

  // Check attempts in current window
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  const attemptsStmt = db.prepare(`
    SELECT attempts, window_start FROM rate_limits
    WHERE identifier = ?
      AND identifier_type = ?
      AND action = ?
      AND window_start > ?
    LIMIT 1
  `);

  const attemptsResult = attemptsStmt.get(identifier, identifierType, action, windowStart) as
    { attempts: number; window_start: string } | undefined;

  if (attemptsResult) {
    if (attemptsResult.attempts >= maxAttempts) {
      // Lock it
      const lockedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      const updateStmt = db.prepare(`
        UPDATE rate_limits
        SET locked_until = ?
        WHERE identifier = ? AND identifier_type = ? AND action = ?
      `);
      updateStmt.run(lockedUntil, identifier, identifierType, action);

      return {
        allowed: false,
        lockedUntil
      };
    }

    // Increment attempts
    const updateStmt = db.prepare(`
      UPDATE rate_limits
      SET attempts = attempts + 1
      WHERE identifier = ? AND identifier_type = ? AND action = ?
    `);
    updateStmt.run(identifier, identifierType, action);

    return {
      allowed: true,
      remainingAttempts: maxAttempts - attemptsResult.attempts - 1
    };
  }

  // Create new rate limit entry
  const insertStmt = db.prepare(`
    INSERT INTO rate_limits (identifier, identifier_type, action, attempts)
    VALUES (?, ?, ?, 1)
  `);
  insertStmt.run(identifier, identifierType, action);

  return {
    allowed: true,
    remainingAttempts: maxAttempts - 1
  };
}

// Audit log
export function logAudit(
  action: string,
  email: string | null,
  success: boolean,
  ipAddress: string,
  userAgent: string,
  errorMessage?: string,
  metadata?: Record<string, any>
) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO audit_log (action, email, success, ip_address, user_agent, error_message, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    action,
    email?.toLowerCase() || null,
    success ? 1 : 0,
    ipAddress,
    userAgent,
    errorMessage || null,
    metadata ? JSON.stringify(metadata) : null
  );
}

// Export db getter for scripts
export { getDb };
