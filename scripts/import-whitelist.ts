#!/usr/bin/env tsx
// Import whitelist from the whitelist file

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getDb, addToWhitelist } from '../src/lib/db';

// Load environment variables from .env.local
config({ path: '.env.local' });

const WHITELIST_FILE = path.join(process.cwd(), 'whitelist');

function normalizeEmail(email: string): string {
  // Add @parity.io if missing
  if (!email.includes('@')) {
    return `${email}@parity.io`;
  }
  return email.toLowerCase().trim();
}

async function importWhitelist() {
  console.log('📋 Importing whitelist from', WHITELIST_FILE);
  console.log('');

  const content = fs.readFileSync(WHITELIST_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const line of lines) {
    const email = normalizeEmail(line);

    try {
      await addToWhitelist(email, undefined, 'Core Team', 'Imported from whitelist file');
      console.log(`✅ Added: ${email}`);
      imported++;
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'SQLITE_CONSTRAINT') {
        console.log(`⏭️  Skipped (already exists): ${email}`);
        skipped++;
      } else {
        console.error(`❌ Error adding ${email}:`, error.message || String(err));
        errors++;
      }
    }
  }

  console.log('');
  console.log('========================================');
  console.log('Import Complete');
  console.log('========================================');
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log(`📊 Total:    ${imported + skipped}`);
  console.log('========================================');
}

importWhitelist().catch(console.error);
