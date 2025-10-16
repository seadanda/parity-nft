import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

async function backupDatabase() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  let db;

  if (!url) {
    // Fallback to local SQLite for development (same path as db.ts)
    console.log('📁 Backing up local SQLite database: ./data/whitelist.sqlite');
    db = createClient({
      url: 'file:./data/whitelist.sqlite'
    });
  } else {
    console.log('🔗 Connecting to remote database...');
    db = createClient({
      url,
      authToken
    });
  }

  // Create backups directory if it doesn't exist
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

  console.log(`Creating backup: ${backupFile}`);

  let sqlDump = '';

  // Get all tables
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

  for (const table of tables.rows) {
    const tableName = (table as any).name;
    console.log(`Backing up table: ${tableName}`);

    // Get CREATE statement
    const createStmt = await db.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
    if (createStmt.rows.length > 0) {
      sqlDump += `${(createStmt.rows[0] as any).sql};\n\n`;
    }

    // Get all data
    const data = await db.execute(`SELECT * FROM ${tableName}`);

    if (data.rows.length > 0) {
      const columns = data.columns;

      for (const row of data.rows) {
        const values = columns.map(col => {
          const val = (row as any)[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          return val;
        }).join(', ');

        sqlDump += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`;
      }
      sqlDump += '\n';
    }
  }

  // Write to file
  fs.writeFileSync(backupFile, sqlDump, 'utf8');

  console.log('✓ Backup completed successfully!');
  console.log(`  File: ${backupFile}`);
  console.log(`  Size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);

  // Show summary
  console.log('\nDatabase summary:');
  for (const table of tables.rows) {
    const tableName = (table as any).name;
    const count = await db.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    console.log(`  ${tableName}: ${(count.rows[0] as any).count} rows`);
  }

  db.close();
}

backupDatabase().catch(console.error);
