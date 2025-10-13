#!/usr/bin/env tsx
/**
 * Add an email to the whitelist (works with both local and production Turso)
 *
 * Usage:
 *   npm run whitelist:add user@example.com
 *   npm run whitelist:add user@example.com "John Doe"
 *   npm run whitelist:add user@example.com "John Doe" "VIP"
 */

import { addToWhitelist, isEmailWhitelisted } from '../src/lib/db';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Error: Email address required\n');
  console.log('Usage:');
  console.log('  npm run whitelist:add user@example.com');
  console.log('  npm run whitelist:add user@example.com "John Doe"');
  console.log('  npm run whitelist:add user@example.com "John Doe" "VIP"');
  process.exit(1);
}

const email = args[0].toLowerCase().trim();
const name = args[1] || undefined;
const category = args[2] || undefined;

// Validate email format
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('❌ Error: Invalid email format:', email);
  process.exit(1);
}

async function addEmail() {
  try {
    console.log('🔍 Checking if email is already whitelisted...\n');

    // Check if already exists
    const exists = await isEmailWhitelisted(email);
    if (exists) {
      console.log('⚠️  Email is already whitelisted:', email);
      console.log('✅ Nothing to do!');
      return;
    }

    console.log('➕ Adding to whitelist...\n');
    await addToWhitelist(email, name, category, 'Added via CLI');

    console.log('✅ Successfully added to whitelist!');
    console.log('');
    console.log('📧 Email:', email);
    if (name) console.log('👤 Name:', name);
    if (category) console.log('🏷️  Category:', category);

  } catch (error) {
    console.error('❌ Error adding to whitelist:', error);
    process.exit(1);
  }
}

addEmail();
