#!/usr/bin/env node

/**
 * Migration deploy script for production (Vercel, etc.).
 * Uses direct connection for Neon (avoids P1002 advisory lock timeout with pooler).
 * Retries on P1002 (advisory lock timeout).
 * Use: npm run db:migrate:deploy or in vercel-build
 */

const { execSync } = require('child_process');

// For Neon: use direct connection for migrations to avoid P1002 advisory lock timeout.
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('-pooler.')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('-pooler.', '.');
}

const maxAttempts = 3;
const delayMs = 5000;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    process.exit(0);
  } catch (err) {
    const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '') + (err.message || '');
    const isP1002 = output.includes('P1002') || output.includes('advisory lock') || output.includes('timed out');
    if (isP1002 && attempt < maxAttempts) {
      console.warn(`Migration timed out (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs / 1000}s...`);
      const deadline = Date.now() + delayMs;
      while (Date.now() < deadline) { /* busy wait */ }
    } else {
      process.exit(1);
    }
  }
}
