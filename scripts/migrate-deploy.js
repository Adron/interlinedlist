#!/usr/bin/env node

/**
 * Migration deploy script for production (Vercel, etc.).
 * Uses direct connection for Neon (avoids P1002 advisory lock timeout with pooler).
 * Retries on P1002 (advisory lock timeout).
 * Use: npm run db:migrate:deploy or in vercel-build
 *
 * Set SKIP_DB_MIGRATE=1 to skip migrations (e.g. preview deploys without DB).
 * When DATABASE_URL is unset, migrations are skipped and build continues.
 */

const { execSync } = require('child_process');

if (process.env.SKIP_DB_MIGRATE === '1') {
  console.log('[migrate-deploy] Skipping migrations (SKIP_DB_MIGRATE=1)');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.warn('[migrate-deploy] DATABASE_URL not set; skipping migrations. Run migrations separately for production.');
  process.exit(0);
}

// For Neon: use direct connection for migrations to avoid P1002 advisory lock timeout with pooler.
if (process.env.DATABASE_URL.includes('-pooler.')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('-pooler.', '.');
}

const maxAttempts = 3;
const delayMs = 5000;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    process.exit(0);
  } catch (err) {
    const stdout = err.stdout?.toString() || '';
    const stderr = err.stderr?.toString() || '';
    const output = stdout + stderr + (err.message || '');
    const isP1002 = output.includes('P1002') || output.includes('advisory lock') || output.includes('timed out');
    if (isP1002 && attempt < maxAttempts) {
      console.warn(`[migrate-deploy] Migration timed out (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs / 1000}s...`);
      const deadline = Date.now() + delayMs;
      while (Date.now() < deadline) { /* busy wait */ }
    } else {
      console.error('[migrate-deploy] Migration failed:');
      if (stdout) console.error(stdout);
      if (stderr) console.error(stderr);
      if (!stdout && !stderr) console.error(err.message);
      process.exit(1);
    }
  }
}
