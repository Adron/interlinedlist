#!/usr/bin/env node

/**
 * Diagnose failed Prisma migrations.
 * Queries _prisma_migrations for error details and checks sessions table existence.
 * Run: node scripts/migrate-diagnose.js
 */

require('dotenv').config();

// Use direct connection for Neon (same as migrate-deploy)
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('-pooler.')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('-pooler.', '.');
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const migrationName = '20260305000000_add_sessions';

  try {
    const failedRow = await prisma.$queryRawUnsafe(`
      SELECT * FROM _prisma_migrations WHERE migration_name = $1
    `, migrationName);

    const sessionsExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'sessions'
      ) as "exists"
    `);

    const row = failedRow?.[0];
    const errorLogs = row?.logs ?? row?.error ?? null;
    const tableExists = sessionsExists?.[0]?.exists ?? false;

    console.log('\n--- Migration diagnosis ---');
    console.log('Migration:', migrationName);
    console.log('Migration record:', row ? 'yes' : 'no');
    console.log('Full row:', row ? JSON.stringify(row, null, 2) : '(none)');
    console.log('Sessions table exists:', tableExists);
    console.log('---\n');

    if (tableExists && errorLogs) {
      console.log('RECOMMENDATION: Sessions table exists. If the schema matches, run:');
      console.log(`  npx prisma migrate resolve --applied "${migrationName}"`);
    } else if (!tableExists && errorLogs) {
      console.log('RECOMMENDATION: Table does not exist. Resolve the error, then run:');
      console.log(`  npx prisma migrate resolve --rolled-back "${migrationName}"`);
      console.log('  npm run db:migrate:deploy');
    }
  } catch (err) {
    console.error('Diagnostic error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
