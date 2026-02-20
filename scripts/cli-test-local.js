#!/usr/bin/env node
/**
 * Verify local dev server is running and print steps for manual CLI testing.
 * Run: npm run cli:test-local
 */
const http = require('http');

http
  .get('http://localhost:3000', (res) => {
    console.log('✓ Dev server OK at http://localhost:3000\n');
    console.log('Next steps for local CLI testing:');
    console.log('1. Run: il-sync init');
    console.log('   - Sync root: ~/test-sync-docs (or any folder)');
    console.log('   - Server URL: http://localhost:3000');
    console.log('   - Email and password: your account credentials');
    console.log('3. Run: il-sync (foreground) to start daemon and test push/pull');
    console.log('   Or: il-sync --install (install as OS service)');
    process.exit(0);
  })
  .on('error', (err) => {
    console.error('✗ Dev server not reachable at http://localhost:3000');
    console.error('  Run "npm run dev" in another terminal first.');
    process.exit(1);
  });
