#!/usr/bin/env node

/**
 * Migration deploy script — targets the remote database (Neon, Supabase, or any provider).
 *
 * Reads only .env; deliberately skips .env.local so a local DATABASE_URL override
 * (typically localhost:5432) never takes precedence over the remote URL.
 * On Vercel, .env.local is absent anyway, so behaviour is identical in both contexts.
 *
 * Use: npm run db:migrate:deploy (local → remote) or via vercel-build
 *
 * Provider notes:
 *   - Neon: pooler hostnames (-pooler.) are automatically swapped to direct connections
 *     to avoid P1002 advisory lock timeouts during DDL.
 *   - Supabase: set DATABASE_URL in .env to the direct port (5432), not PgBouncer (6543).
 *   - Other providers: ensure DATABASE_URL points to a direct connection, not a pooler.
 *
 * Set SKIP_DB_MIGRATE=1 to skip migrations (e.g. preview deploys without a DB).
 * When DATABASE_URL is unset, migrations are skipped and the build continues.
 *
 * Recovers from:
 * - P1002 / advisory lock timeout: retries up to 3 times.
 * - P3009: failed migration recorded in _prisma_migrations — resolve --rolled-back, redeploy.
 * - P3018 + duplicate/already exists: same resolve path when SQL is idempotent (IF NOT EXISTS).
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/** P3018 apply failure: Migration name: 20260326120000_add_user_notifications */
const MIGRATION_NAME_RE = /Migration name:\s*(\S+)/m;
/** P3009 blocked deploy: The `20260326120000_add_user_notifications` migration started at ... failed */
const P3009_MIGRATION_RE = /The `([^`]+)` migration/m;

/**
 * Postgres: duplicate column / relation / object — typical when schema was applied outside migrate.
 * See https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_DUPLICATE_SQLSTATE_RE =
  /\b(?:42701|42P07|42710)\b|Database error code:\s*(?:42701|42P07|42710)\b/i;

function runPrisma(args) {
  const r = spawnSync('npx', ['prisma', ...args], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf-8',
  });
  const stdout = r.stdout || '';
  const stderr = r.stderr || '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  return { status: r.status ?? 1, out: stdout + stderr };
}

function extractFailedMigrationName(output) {
  let m = output.match(MIGRATION_NAME_RE);
  if (m) return m[1].trim();
  m = output.match(P3009_MIGRATION_RE);
  return m ? m[1].trim() : null;
}

function isRecoverableAlreadyExistsFailure(output) {
  if (!output.includes('P3018')) return false;
  if (PG_DUPLICATE_SQLSTATE_RE.test(output)) return true;
  if (/\balready exists\b/i.test(output)) return true;
  return false;
}

// Load only .env — deliberately skip .env.local so a local DATABASE_URL (localhost)
// never overrides the remote URL. Shell env vars always take precedence over .env.
function loadEnvFile(file) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key in process.env) continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnvFile('.env');

if (process.env.SKIP_DB_MIGRATE === '1') {
  console.log('[migrate-deploy] Skipping migrations (SKIP_DB_MIGRATE=1)');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.warn('[migrate-deploy] DATABASE_URL not set; skipping migrations. Run migrations separately for production.');
  process.exit(0);
}

if (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')) {
  console.error('[migrate-deploy] DATABASE_URL resolves to localhost. This script must target the remote database.');
  console.error('[migrate-deploy] Ensure DATABASE_URL in .env (or the shell environment) points to the remote database.');
  process.exit(1);
}

// Swap pooler hostname to direct connection for DDL — avoids P1002 advisory lock timeout (Neon).
if (process.env.DATABASE_URL.includes('-pooler.')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('-pooler.', '.');
}

const maxP1002Attempts = 3;
const delayMs = 5000;
const maxAutoResolves = 25;

let p1002Attempts = 0;
const rolledBackMigrations = new Set();
let resolveCount = 0;

for (;;) {
  const { status, out } = runPrisma(['migrate', 'deploy']);
  if (status === 0) {
    process.exit(0);
  }

  const isP1002 =
    out.includes('P1002') || out.includes('advisory lock') || out.includes('timed out');

  if (isP1002 && p1002Attempts < maxP1002Attempts) {
    p1002Attempts += 1;
    console.warn(
      `[migrate-deploy] Migration timed out (attempt ${p1002Attempts}/${maxP1002Attempts}). Retrying in ${delayMs / 1000}s...`
    );
    const deadline = Date.now() + delayMs;
    while (Date.now() < deadline) {
      /* busy wait */
    }
    continue;
  }

  const migrationName = extractFailedMigrationName(out);
  const isP3009Blocked = out.includes('P3009');

  const canResolveP3009 =
    isP3009Blocked &&
    migrationName &&
    !rolledBackMigrations.has(migrationName) &&
    resolveCount < maxAutoResolves;

  const canResolveP3018Duplicate =
    migrationName &&
    !rolledBackMigrations.has(migrationName) &&
    isRecoverableAlreadyExistsFailure(out) &&
    resolveCount < maxAutoResolves;

  if (canResolveP3009 || canResolveP3018Duplicate) {
    resolveCount += 1;
    const reason = isP3009Blocked
      ? 'P3009 (failed migration recorded in database; will re-apply migration SQL)'
      : 'P3018 + object already exists (re-apply must be idempotent: IF NOT EXISTS, etc.)';
    console.warn(
      `[migrate-deploy] ${reason} for "${migrationName}". Running migrate resolve --rolled-back, then retrying deploy.`
    );
    const resolveResult = runPrisma(['migrate', 'resolve', '--rolled-back', migrationName]);
    if (resolveResult.status !== 0) {
      console.error('[migrate-deploy] migrate resolve --rolled-back failed.');
      process.exit(1);
    }
    rolledBackMigrations.add(migrationName);
    continue;
  }

  console.error('[migrate-deploy] Migration failed.');
  process.exit(1);
}
