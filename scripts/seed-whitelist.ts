#!/usr/bin/env tsx
/**
 * Seed database with test emails for local development
 * Uses the same @libsql/client as the rest of the app
 *
 * Usage:
 *   npm run db:seed          # Add test emails (preserves existing)
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

// Test emails to seed
const testEmails = [
  { email: 'donal.murray@parity.io', name: 'Donal Murray (Owner)' },
  { email: 'test@parity.io', name: 'Test User' },
  { email: 'alice@example.com', name: 'Alice' },
  { email: 'bob@example.com', name: 'Bob' },
  { email: 'charlie@example.com', name: 'Charlie' },
  { email: 'dave@example.com', name: 'Dave' },
];

async function seedDatabase() {
  const db = getDbClient();

  try {
    console.log('🌱 Seeding whitelist with test users...\n');

    let added = 0;
    let skipped = 0;

    for (const { email, name } of testEmails) {
      try {
        await db.execute({
          sql: 'INSERT INTO whitelist (email, name, category, notes) VALUES (?, ?, ?, ?)',
          args: [email.toLowerCase(), name, 'test', 'Seeded for local testing']
        });
        console.log('  ✅ Added:', email);
        added++;
      } catch (err: unknown) {
        // Check if it's a constraint error (already exists)
        const error = err as { message?: string; code?: string };
        if (error.message?.includes('UNIQUE') || error.code === 'SQLITE_CONSTRAINT') {
          console.log('  ⏭️  Skipped (exists):', email);
          skipped++;
        } else {
          throw err;
        }
      }
    }

    // Get total count
    const result = await db.execute('SELECT COUNT(*) as count FROM whitelist');
    const count = result.rows[0]?.count || 0;

    console.log('\n📊 Summary:');
    console.log(`  • Added: ${added}`);
    console.log(`  • Skipped: ${skipped}`);
    console.log(`  • Total whitelisted emails: ${count}`);
    console.log('\n✅ Database seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
