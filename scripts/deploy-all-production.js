#!/usr/bin/env node
/**
 * Production deploy prep: cross-compile the Document Sync CLI and install binaries
 * under public/downloads/ so /help/tooling and static URLs match.
 *
 * Usage:
 *   npm run deploy-all-production          — full run + next-step hints
 *   npm run cli:build                      — same build/copy, minimal output (--binaries-only)
 *
 * Requires: Go toolchain and `make` on PATH.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const binariesOnly = process.argv.includes('--binaries-only');

/** Makefile outputs in cli/dist → served at site root */
const BINARY_COPIES = [
  ['il-sync-darwin-arm64', 'public/downloads/darwin-arm64/il-sync'],
  ['il-sync-darwin-amd64', 'public/downloads/darwin-amd64/il-sync'],
  ['il-sync-linux-arm64', 'public/downloads/linux-arm64/il-sync'],
  ['il-sync-linux-amd64', 'public/downloads/linux-amd64/il-sync'],
  ['il-sync-windows-amd64.exe', 'public/downloads/windows/il-sync.exe'],
];

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function checkCmd(name, args = ['--version']) {
  const r = spawnSync(name, args, { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    fail(
      `Missing or broken "${name}". Install it and ensure it is on your PATH.\n` +
        (r.error ? `  (${r.error.message})` : '')
    );
  }
}

function main() {
  if (!binariesOnly) {
    console.log('deploy-all-production: building CLI binaries for all platforms...\n');
  }

  checkCmd('go', ['version']);

  const make = spawnSync('make', ['-C', path.join(root, 'cli'), 'all'], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  });
  if (make.status !== 0) {
    fail(`make -C cli all failed with exit ${make.status ?? 'unknown'}`);
  }

  const dist = path.join(root, 'cli', 'dist');
  for (const [srcName, destRel] of BINARY_COPIES) {
    const src = path.join(dist, srcName);
    const dest = path.join(root, destRel);
    if (!fs.existsSync(src)) {
      fail(`Expected build output missing: ${path.relative(root, src)}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    try {
      fs.chmodSync(dest, 0o755);
    } catch {
      /* Windows may ignore chmod; .exe does not need +x */
    }
    if (!binariesOnly) {
      console.log(`  → ${destRel}`);
    }
  }

  if (!binariesOnly) {
    console.log('\nDone. Binaries are under public/downloads/ for Next.js static serving.');
    console.log('Help: /help/tooling ← documentation/help/tooling.md; contributor CLI+local server docs: documentation/developer/');
    console.log('\nNext steps for production:');
    console.log('  1. git add public/downloads && git commit -m "chore: refresh CLI binaries"');
    console.log('  2. Push and deploy (e.g. Vercel), or run locally: npm run vercel-build');
  }
}

main();
