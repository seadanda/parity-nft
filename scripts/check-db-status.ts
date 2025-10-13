#!/usr/bin/env tsx
/**
 * Quick database status check
 * Shows table counts and recent activity
 */

import { getDb } from '../src/lib/db';

async function checkStatus() {
  const db = getDb();

  try {
    console.log('🔍 Database Status Check\n');
    console.log('==========================================\n');

    // Whitelist count
    const whitelistResult = await db.execute('SELECT COUNT(*) as count FROM whitelist');
    const whitelistCount = whitelistResult.rows[0]?.count || 0;
    console.log(`📋 Whitelist entries: ${whitelistCount}`);

    // Mint records count
    const mintsResult = await db.execute('SELECT COUNT(*) as count FROM mint_records');
    const mintsCount = mintsResult.rows[0]?.count || 0;
    console.log(`✅ Minted: ${mintsCount}`);

    // Sessions count
    const sessionsResult = await db.execute('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1');
    const sessionsCount = sessionsResult.rows[0]?.count || 0;
    console.log(`🔐 Active sessions: ${sessionsCount}`);

    // Recent audit events
    const auditResult = await db.execute(`
      SELECT COUNT(*) as count
      FROM audit_log
      WHERE timestamp > datetime('now', '-24 hours')
    `);
    const auditCount = auditResult.rows[0]?.count || 0;
    console.log(`📊 Audit events (24h): ${auditCount}`);

    console.log('\n==========================================');
    console.log('✅ Database is operational\n');

  } catch (error) {
    console.error('❌ Error checking database status:', error);
    process.exit(1);
  }
}

checkStatus();
