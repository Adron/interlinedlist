#!/usr/bin/env node

/**
 * Migration deploy script for production (Vercel, etc.).
 * Uses direct connection for Neon (avoids P1002 advisory lock timeout with pooler).
 * Retries on P1002 (advisory lock timeout).
 * Recovers from:
 * - P3009: a migration is marked failed in `_prisma_migrations` — resolve --rolled-back, redeploy.
 * - P3018 + duplicate/already exists: same resolve path when re-apply is safe (idempotent SQL).
 *
 * Use: npm run db:migrate:deploy or in vercel-build
 *
 * Set SKIP_DB_MIGRATE=1 to skip migrations (e.g. preview deploys without DB).
 * When DATABASE_URL is unset, migrations are skipped and build continues.
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

// Load .env and .env.local when running locally (Node does not auto-load these).
// Existing env vars (e.g. from Vercel or shell) take precedence. .env.local overrides .env.
function loadEnvFile(file, override = false) {
  const p = path.resolve(process.cwd(), file);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        if (!override && key in process.env) continue;
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}
loadEnvFile('.env');
loadEnvFile('.env.local', true);

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
