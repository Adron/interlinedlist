#!/usr/bin/env node

/**
 * Apply pending migrations to the remote database (Neon, Supabase, or any provider).
 *
 * Problem this solves:
 *   `npm run db:migrate` and `npm run db:migrate:deploy` both load .env.local,
 *   which overrides DATABASE_URL to localhost:5432. This means all local migration
 *   runs target the local database, never the remote. This script reads only .env
 *   (ignoring .env.local), so the remote DATABASE_URL is used.
 *
 * Usage:
 *   npm run db:migrate:remote
 *
 * Provider notes:
 *   - Neon: if DATABASE_URL uses the pooler hostname (-pooler.), this script
 *     automatically switches to the direct connection (replaces -pooler. with .)
 *     to avoid P1002 advisory lock timeouts during DDL.
 *   - Supabase: configure DATABASE_URL in .env with the direct port (5432), not
 *     the PgBouncer port (6543). No hostname manipulation is needed.
 *   - Other providers: ensure DATABASE_URL in .env points to a direct connection
 *     (not a connection pooler) before running migrations.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};
const log = (msg, c = 'reset') => console.log(`${colors[c]}${msg}${colors.reset}`);
const info = (msg) => log(`ℹ ${msg}`, 'blue');
const ok = (msg) => log(`✓ ${msg}`, 'green');
const warn = (msg) => log(`⚠ ${msg}`, 'yellow');
const fail = (msg) => log(`✗ ${msg}`, 'red');

// Load only .env — deliberately skip .env.local so localhost does not override Neon.
function readEnvFile(file) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return {};
  const result = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

const baseEnv = readEnvFile('.env');

// Resolve DATABASE_URL: shell env wins, then .env (no .env.local).
let dbUrl = process.env.DATABASE_URL || baseEnv.DATABASE_URL || '';

if (!dbUrl) {
  fail('DATABASE_URL not found in environment or .env. Cannot target remote database.');
  process.exit(1);
}

if (!(dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
  fail(`DATABASE_URL does not start with postgresql:// or postgres://: ${dbUrl.slice(0, 40)}…`);
  process.exit(1);
}

if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
  fail('DATABASE_URL resolves to localhost. This script must target a remote database.');
  fail('Ensure your shell DATABASE_URL or .env DATABASE_URL points to the remote database.');
  process.exit(1);
}

// Use direct connection (not pooler) for DDL — avoids P1002 advisory lock timeout.
if (dbUrl.includes('-pooler.')) {
  dbUrl = dbUrl.replace('-pooler.', '.');
  info('Switched Neon pooler URL to direct connection for migrations.');
}

const maskedUrl = dbUrl.replace(/postgresql:\/\/[^@]+@/, 'postgresql://<creds>@');
info(`Targeting Neon: ${maskedUrl}`);

const env = { ...process.env, ...baseEnv, DATABASE_URL: dbUrl };

const maxAttempts = 3;
const delayMs = 5000;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env,
    encoding: 'utf-8',
    stdio: 'inherit',
  });

  if (r.status === 0) {
    ok('Neon migrations applied successfully.');
    process.exit(0);
  }

  const out = (r.stdout || '') + (r.stderr || '');
  const isTimeout = out.includes('P1002') || out.includes('advisory lock') || out.includes('timed out');
  if (isTimeout && attempt < maxAttempts) {
    warn(`Migration timed out (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs / 1000}s…`);
    const deadline = Date.now() + delayMs;
    while (Date.now() < deadline) { /* busy wait */ }
    continue;
  }

  fail('Migration against Neon failed.');
  process.exit(r.status ?? 1);
}
