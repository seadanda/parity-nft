// Database setup and queries for whitelist system
// Supports both local SQLite (dev) and Turso (production)
import { createClient, type Client } from '@libsql/client';
import crypto from 'crypto';

// Database client (works with both local SQLite and Turso)
let db: Client | null = null;

function getDb(): Client {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      // Fallback to local SQLite for development
      db = createClient({
        url: 'file:./data/whitelist.sqlite'
      });
    } else {
      // Use Turso (or remote libsql)
      db = createClient({
        url,
        authToken
      });
    }

    // Initialize tables on first connection
    initializeTables().catch(err => {
      console.error('Failed to initialize database tables:', err);
    });
  }
  return db;
}

async function initializeTables() {
  const db = getDb();

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
}

// Whitelist queries
export async function isEmailWhitelisted(email: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT 1 FROM whitelist WHERE LOWER(email) = LOWER(?) LIMIT 1',
    args: [email]
  });
  return result.rows.length > 0;
}

export async function getWhitelistEntry(email: string) {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM whitelist WHERE LOWER(email) = LOWER(?)',
    args: [email]
  });
  return result.rows[0] || null;
}

export async function getAllWhitelist() {
  const db = getDb();
  const result = await db.execute(`
    SELECT w.*,
           m.nft_id,
           m.minted_at,
           CASE WHEN m.email IS NOT NULL THEN 1 ELSE 0 END as has_minted
    FROM whitelist w
    LEFT JOIN mint_records m ON w.email = m.email
    ORDER BY w.added_at DESC
  `);
  return result.rows;
}

export async function addToWhitelist(email: string, name?: string, category?: string, notes?: string) {
  const db = getDb();
  const result = await db.execute({
    sql: 'INSERT INTO whitelist (email, name, category, notes) VALUES (?, ?, ?, ?)',
    args: [email.toLowerCase(), name || null, category || null, notes || null]
  });
  return result;
}

// Verification code queries
export async function createVerificationCode(email: string, ipAddress: string, userAgent: string): Promise<string> {
  const db = getDb();
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // IMPORTANT: Invalidate any existing unused codes for this email
  // This ensures only ONE code is active at a time (prevents timing attacks)
  await db.execute({
    sql: 'UPDATE verification_codes SET used_at = CURRENT_TIMESTAMP WHERE email = ? AND used_at IS NULL',
    args: [email.toLowerCase()]
  });

  // Create new code
  await db.execute({
    sql: 'INSERT INTO verification_codes (email, code, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
    args: [email.toLowerCase(), code, expiresAt, ipAddress, userAgent]
  });

  return code;
}

export async function verifyCode(email: string, code: string): Promise<boolean> {
  const db = getDb();

  // Find valid unused code
  const result = await db.execute({
    sql: `
      SELECT id FROM verification_codes
      WHERE LOWER(email) = LOWER(?)
        AND code = ?
        AND used_at IS NULL
        AND expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    args: [email, code]
  });

  if (result.rows.length > 0) {
    const codeId = result.rows[0].id;
    // Mark code as used
    await db.execute({
      sql: 'UPDATE verification_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [codeId]
    });
    return true;
  }

  return false;
}

// Session queries
export async function createSession(email: string, ipAddress: string, userAgent: string): Promise<string> {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours

  await db.execute({
    sql: 'INSERT INTO sessions (email, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
    args: [email.toLowerCase(), token, expiresAt, ipAddress, userAgent]
  });

  return token;
}

export async function validateSession(token: string): Promise<{ email: string; name?: string } | null> {
  const db = getDb();

  const result = await db.execute({
    sql: `
      SELECT s.email, w.name
      FROM sessions s
      LEFT JOIN whitelist w ON s.email = w.email
      WHERE s.token = ?
        AND s.is_active = 1
        AND s.expires_at > datetime('now')
      LIMIT 1
    `,
    args: [token]
  });

  if (result.rows.length > 0) {
    const session = result.rows[0];
    // Update last activity
    await db.execute({
      sql: 'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = ?',
      args: [token]
    });
    return {
      email: session.email as string,
      name: session.name as string | undefined
    };
  }

  return null;
}

// Mint record queries
export async function hasEmailMinted(email: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT 1 FROM mint_records WHERE LOWER(email) = LOWER(?) LIMIT 1',
    args: [email]
  });
  return result.rows.length > 0;
}

export async function recordMint(
  email: string,
  walletAddress: string,
  collectionId: number,
  nftId: number,
  hash: string,
  tier: string,
  rarity: string,
  transactionHash?: string,
  metadataIpfs?: string,
  imageIpfs?: string
) {
  const db = getDb();
  const result = await db.execute({
    sql: `
      INSERT INTO mint_records (
        email, wallet_address, collection_id, nft_id, hash, tier, rarity,
        transaction_hash, metadata_ipfs, image_ipfs, minted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    args: [
      email.toLowerCase(),
      walletAddress,
      collectionId,
      nftId,
      hash,
      tier,
      rarity,
      transactionHash || null,
      metadataIpfs || null,
      imageIpfs || null
    ]
  });
  return result;
}

// Rate limiting queries
export async function checkRateLimit(
  identifier: string,
  identifierType: 'email' | 'session',
  action: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ allowed: boolean; remainingAttempts?: number; lockedUntil?: string }> {
  const db = getDb();

  // Check if locked
  const lockResult = await db.execute({
    sql: `
      SELECT locked_until FROM rate_limits
      WHERE identifier = ?
        AND identifier_type = ?
        AND action = ?
        AND locked_until > datetime('now')
      LIMIT 1
    `,
    args: [identifier, identifierType, action]
  });

  if (lockResult.rows.length > 0) {
    return {
      allowed: false,
      lockedUntil: lockResult.rows[0].locked_until as string
    };
  }

  // Check attempts in current window
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  const attemptsResult = await db.execute({
    sql: `
      SELECT attempts, window_start FROM rate_limits
      WHERE identifier = ?
        AND identifier_type = ?
        AND action = ?
        AND window_start > ?
      LIMIT 1
    `,
    args: [identifier, identifierType, action, windowStart]
  });

  if (attemptsResult.rows.length > 0) {
    const row = attemptsResult.rows[0];
    const attempts = row.attempts as number;

    if (attempts >= maxAttempts) {
      // Lock it
      const lockedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      await db.execute({
        sql: `
          UPDATE rate_limits
          SET locked_until = ?
          WHERE identifier = ? AND identifier_type = ? AND action = ?
        `,
        args: [lockedUntil, identifier, identifierType, action]
      });

      return {
        allowed: false,
        lockedUntil
      };
    }

    // Increment attempts
    await db.execute({
      sql: `
        UPDATE rate_limits
        SET attempts = attempts + 1
        WHERE identifier = ? AND identifier_type = ? AND action = ?
      `,
      args: [identifier, identifierType, action]
    });

    return {
      allowed: true,
      remainingAttempts: maxAttempts - attempts - 1
    };
  }

  // Create new rate limit entry
  await db.execute({
    sql: 'INSERT INTO rate_limits (identifier, identifier_type, action, attempts) VALUES (?, ?, ?, 1)',
    args: [identifier, identifierType, action]
  });

  return {
    allowed: true,
    remainingAttempts: maxAttempts - 1
  };
}

// Audit log
export async function logAudit(
  action: string,
  email: string | null,
  success: boolean,
  ipAddress: string,
  userAgent: string,
  errorMessage?: string,
  metadata?: Record<string, any>
) {
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO audit_log (action, email, success, ip_address, user_agent, error_message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      action,
      email?.toLowerCase() || null,
      success ? 1 : 0,
      ipAddress,
      userAgent,
      errorMessage || null,
      metadata ? JSON.stringify(metadata) : null
    ]
  });
}

// Export db getter for scripts
export { getDb };
