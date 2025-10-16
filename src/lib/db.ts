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
      has_minted INTEGER NOT NULL DEFAULT 0,
      minting_state TEXT NOT NULL DEFAULT 'idle',
      minting_started_at TEXT,
      added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      added_by TEXT
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_whitelist_email ON whitelist(email)');

  // Migration: Add minting_state columns if they don't exist
  try {
    await db.execute(`ALTER TABLE whitelist ADD COLUMN minting_state TEXT NOT NULL DEFAULT 'idle'`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    await db.execute(`ALTER TABLE whitelist ADD COLUMN minting_started_at TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Verification codes table
  // Only one active code per email - new requests overwrite old ones
  await db.execute(`
    CREATE TABLE IF NOT EXISTS verification_codes (
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

  // Mint records table - tracks all mints
  // Note: email is NOT stored for privacy - use sessions table to link email to mints
  await db.execute(`
    CREATE TABLE IF NOT EXISTS mint_records (
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
  // Note: mint_records no longer contains email for privacy
  // has_minted flag is tracked in whitelist table
  const result = await db.execute(`
    SELECT * FROM whitelist
    ORDER BY added_at DESC
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

  // Use INSERT OR REPLACE to ensure only one verification code per email
  // This automatically overwrites any existing code and refreshes the 10 minute timer
  await db.execute({
    sql: 'INSERT OR REPLACE INTO verification_codes (email, code, expires_at, ip_address, user_agent, created_at, used_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)',
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
// Note: We check hasEmailMinted via whitelist table
// mint_records intentionally does NOT store email for privacy

/**
 * Atomically check if email can mint and lock it for minting
 * Returns true if successfully locked, false if already minted or locked
 *
 * States:
 * - 'idle': Not minting, can start
 * - 'minting': Currently minting (locked)
 * - 'completed': Mint finished successfully
 * - 'failed': Mint failed, can retry after timeout
 */
export async function tryLockForMinting(email: string): Promise<{ success: boolean; reason?: string }> {
  const db = getDb();

  // Atomically check and update in a single query
  // This prevents race conditions between checking and locking
  const result = await db.execute({
    sql: `
      UPDATE whitelist
      SET
        minting_state = 'minting',
        minting_started_at = CURRENT_TIMESTAMP
      WHERE LOWER(email) = LOWER(?)
        AND has_minted = 0
        AND (
          minting_state = 'idle'
          OR minting_state = 'failed'
          OR (minting_state = 'minting' AND datetime(minting_started_at, '+10 minutes') < datetime('now'))
        )
    `,
    args: [email]
  });

  if (result.rowsAffected === 0) {
    // Check why it failed
    const checkResult = await db.execute({
      sql: 'SELECT has_minted, minting_state, minting_started_at FROM whitelist WHERE LOWER(email) = LOWER(?)',
      args: [email]
    });

    if (checkResult.rows.length === 0) {
      return { success: false, reason: 'Not whitelisted' };
    }

    const row = checkResult.rows[0] as any;
    if (row.has_minted === 1) {
      return { success: false, reason: 'Already minted' };
    }
    if (row.minting_state === 'minting') {
      return { success: false, reason: 'Mint already in progress' };
    }

    return { success: false, reason: 'Unknown error' };
  }

  return { success: true };
}

/**
 * Mark minting as completed
 */
export async function completeMinting(email: string) {
  const db = getDb();
  await db.execute({
    sql: `UPDATE whitelist SET minting_state = 'completed', has_minted = 1 WHERE LOWER(email) = LOWER(?)`,
    args: [email]
  });
}

/**
 * Mark minting as failed (allows retry)
 */
export async function failMinting(email: string) {
  const db = getDb();
  await db.execute({
    sql: `UPDATE whitelist SET minting_state = 'failed' WHERE LOWER(email) = LOWER(?)`,
    args: [email]
  });
}

/**
 * Check if a wallet address owns any NFT in the collection on-chain
 */
async function checkNFTOwnershipOnChain(walletAddress: string, collectionId: number): Promise<{ hasNFT: boolean; nftId?: number }> {
  try {
    const { createClient } = await import("polkadot-api");
    const { getVercelWsProvider } = await import("./ws-provider-vercel");
    const { dot } = await import("@polkadot-api/descriptors");

    const rpcEndpoint = process.env.RPC_ENDPOINT || 'wss://polkadot-asset-hub-rpc.polkadot.io';
    const provider = await getVercelWsProvider(rpcEndpoint);
    const client = createClient(provider);
    const api = client.getTypedApi(dot);

    console.log(`[cleanup] Checking on-chain ownership for ${walletAddress} in collection ${collectionId}`);

    // Query collection items to find any owned by this address
    const items = await api.query.Nfts.Item.getEntries(collectionId);

    for (const item of items) {
      const itemId = item.keyArgs[1]; // [collectionId, itemId]
      const itemData = item.value;

      if (itemData && itemData.owner === walletAddress) {
        console.log(`[cleanup] Found NFT #${itemId} owned by ${walletAddress}`);
        client.destroy();
        return { hasNFT: true, nftId: itemId };
      }
    }

    console.log(`[cleanup] No NFT found for ${walletAddress}`);
    client.destroy();
    return { hasNFT: false };
  } catch (error) {
    console.error('[cleanup] Error checking NFT ownership:', error);
    // On error, assume they don't have it (safer for preventing double mint)
    return { hasNFT: false };
  }
}

/**
 * Reset stuck minting states (older than 10 minutes)
 * IMPORTANT: Checks on-chain ownership before resetting!
 * If NFT exists on-chain -> mark as completed (prevents data loss)
 * If NFT doesn't exist -> reset to idle for retry
 */
export async function cleanupStuckMintingStates() {
  const db = getDb();

  // Find emails with stuck minting states
  // We need to join with mint_records to get the wallet address they were trying to mint to
  const stuckStates = await db.execute({
    sql: `
      SELECT
        w.email,
        w.minting_started_at,
        (
          SELECT mr.wallet_address
          FROM mint_records mr
          WHERE mr.minted_at >= datetime(w.minting_started_at, '-1 hour')
          ORDER BY mr.minted_at DESC
          LIMIT 1
        ) as attempted_wallet
      FROM whitelist w
      WHERE w.minting_state = 'minting'
        AND w.has_minted = 0
        AND datetime(w.minting_started_at, '+10 minutes') < datetime('now')
    `,
    args: []
  });

  const rows = stuckStates.rows as any[];
  console.log(`[cleanup] Found ${rows.length} stuck minting states`);

  if (rows.length === 0) {
    return { completed: 0, reset: 0 };
  }

  const collectionId = parseInt(process.env.COLLECTION_ID || '662');
  let completedCount = 0;
  let resetCount = 0;

  for (const row of rows) {
    const email = row.email;
    const attemptedWallet = row.attempted_wallet;

    if (!attemptedWallet) {
      // Can't verify without wallet address, reset to idle
      console.log(`[cleanup] No wallet found for ${email}, resetting to idle`);
      await db.execute({
        sql: `UPDATE whitelist SET minting_state = 'idle', minting_started_at = NULL WHERE LOWER(email) = LOWER(?)`,
        args: [email]
      });
      resetCount++;
      continue;
    }

    // Check on-chain if this wallet owns an NFT in the collection
    const ownership = await checkNFTOwnershipOnChain(attemptedWallet, collectionId);

    if (ownership.hasNFT) {
      // Mint succeeded on-chain! Mark as completed
      console.log(`[cleanup] ✅ Found on-chain NFT for ${email}, marking as completed`);
      await completeMinting(email);

      // Try to find and record the mint if not already recorded
      const existingRecord = await db.execute({
        sql: 'SELECT id FROM mint_records WHERE wallet_address = ? AND collection_id = ?',
        args: [attemptedWallet, collectionId]
      });

      if (existingRecord.rows.length === 0 && ownership.nftId) {
        console.log(`[cleanup] Recording discovered mint for ${email}`);
        // We don't have all the metadata, but at least record the basics
        await db.execute({
          sql: `
            INSERT INTO mint_records (wallet_address, collection_id, nft_id, hash, tier, rarity, minted_at)
            VALUES (?, ?, ?, 'recovered', 'Unknown', 'Unknown', datetime('now'))
          `,
          args: [attemptedWallet, collectionId, ownership.nftId]
        });
      }

      completedCount++;
    } else {
      // No NFT on-chain, safe to reset for retry
      console.log(`[cleanup] ❌ No on-chain NFT for ${email}, resetting to idle`);
      await db.execute({
        sql: `UPDATE whitelist SET minting_state = 'idle', minting_started_at = NULL WHERE LOWER(email) = LOWER(?)`,
        args: [email]
      });
      resetCount++;
    }
  }

  console.log(`[cleanup] ✅ Completed: ${completedCount}, ♻️ Reset: ${resetCount}`);
  return { completed: completedCount, reset: resetCount };
}

export async function hasEmailMinted(email: string): Promise<boolean> {
  const db = getDb();
  // Check if this email has minted via whitelist.has_minted flag
  const result = await db.execute({
    sql: 'SELECT has_minted FROM whitelist WHERE LOWER(email) = LOWER(?) LIMIT 1',
    args: [email]
  });
  return result.rows.length > 0 && result.rows[0].has_minted === 1;
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

  // Insert mint record (email is NOT stored for privacy)
  const mintResult = await db.execute({
    sql: `
      INSERT INTO mint_records (
        wallet_address, collection_id, nft_id, hash, tier, rarity,
        transaction_hash, metadata_ipfs, image_ipfs, minted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    args: [
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

  // Mark email as minted in whitelist
  await db.execute({
    sql: 'UPDATE whitelist SET has_minted = 1 WHERE LOWER(email) = LOWER(?)',
    args: [email]
  });

  return mintResult;
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
