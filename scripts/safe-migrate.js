#!/usr/bin/env node

/**
 * Safe migration script for InterlinedList
 * Checks migration status and uses the appropriate Prisma command
 * to prevent destructive database resets
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

// Check if we're in the project root
if (!fs.existsSync(path.join(process.cwd(), 'prisma/schema.prisma'))) {
  logError('prisma/schema.prisma not found. Please run this script from the project root.');
  process.exit(1);
}

// Load environment variables from .env.local if it exists
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

logInfo('Checking migration status...');

try {
  // Check migration status
  let migrateStatus = '';
  let statusExitCode = 0;
  
  try {
    migrateStatus = execSync('npx prisma migrate status', {
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'pipe'],
    });
  } catch (statusError) {
    // migrate status returns non-zero exit code when there are pending migrations or mismatches
    migrateStatus = (statusError.stdout?.toString() || '') + (statusError.stderr?.toString() || '');
    statusExitCode = statusError.status || 1;
  }

  // Check if database is in sync
  if (migrateStatus.includes('Database schema is up to date')) {
    logSuccess('Database schema is up to date!');
    
    // Check if there are schema changes that need a new migration
    logInfo('Checking for schema changes...');
    try {
      const diffOutput = execSync('npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script', {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      if (!diffOutput || diffOutput.trim().length === 0 || diffOutput.includes('No difference')) {
        logInfo('No schema changes detected.');
        process.exit(0);
      }
    } catch (diffError) {
      // Schema changes detected - use migrate dev to create migration
      logWarning('Schema changes detected. Creating new migration...');
      console.log('');
      
      const migrationName = process.argv[2] || `${Date.now()}_schema_change`;
      execSync(`npx prisma migrate dev --name ${migrationName}`, {
        stdio: 'inherit',
      });
      logSuccess('New migration created and applied!');
      process.exit(0);
    }
    
    logInfo('No schema changes detected.');
    process.exit(0);
  }

  // Check if there are pending migrations to apply
  if (migrateStatus.includes('have not yet been applied') || 
      migrateStatus.includes('The following migration(s) have not yet been applied')) {
    logWarning('Found pending migrations that need to be applied.');
    logInfo('Using "prisma migrate deploy" to safely apply migrations without resetting the database...');
    console.log('');
    
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
    });
    logSuccess('Migrations applied successfully!');
    process.exit(0);
  }

  // Check for migration history mismatch
  if (migrateStatus.includes('Your local migration history and the migrations table from your database are different') ||
      migrateStatus.includes('migration history') ||
      migrateStatus.includes('The last common migration is')) {
    logWarning('Migration history mismatch detected!');
    logInfo('Attempting to resolve by applying pending migrations safely...');
    console.log('');
    
    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
      });
      logSuccess('Migrations applied successfully!');
      logInfo('Migration history should now be in sync.');
      process.exit(0);
    } catch (deployError) {
      logError('Could not automatically resolve migration mismatch.');
      console.log('');
      logInfo('Options:');
      logInfo('  1. Use "npm run db:migrate:deploy" to apply pending migrations');
      logInfo('  2. Manually resolve by marking migrations as applied:');
      logInfo('     npx prisma migrate resolve --applied <migration-name>');
      logInfo('  3. If you must reset (WARNING: destroys all data), use:');
      logInfo('     npm run db:migrate:force');
      process.exit(1);
    }
  }

  // If status check failed for unknown reasons, try deploy first
  if (statusExitCode !== 0) {
    logWarning('Migration status check indicates issues. Attempting safe migration...');
    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
      });
      logSuccess('Migrations applied successfully!');
      process.exit(0);
    } catch (deployError) {
      // If deploy fails, we might need to create a new migration
      // But only if status is truly clean
      logInfo('No pending migrations to apply.');
    }
  }

  // Default: use migrate dev for creating new migrations
  // Only do this if status check passed (no mismatches detected)
  if (statusExitCode === 0) {
    logInfo('Creating/updating migrations with "prisma migrate dev"...');
    console.log('');
    
    const migrationName = process.argv[2] || `${Date.now()}_migration`;
    execSync(`npx prisma migrate dev --name ${migrationName}`, {
      stdio: 'inherit',
    });
    
    logSuccess('Migration completed successfully!');
  } else {
    // Status check failed - don't use migrate dev
    logError('Cannot safely create migration due to migration status issues.');
    console.log('');
    logWarning('Please resolve migration issues first:');
    logInfo('  1. Use "npm run db:migrate:deploy" to apply pending migrations');
    logInfo('  2. Resolve any migration history mismatches');
    logInfo('  3. Then run "npm run db:migrate" again');
    logInfo('');
    logInfo('If you must proceed anyway (may prompt for reset), use:');
    logInfo('  npm run db:migrate:force');
    process.exit(1);
  }
  
} catch (error) {
  const errorOutput = (error.stdout?.toString() || '') + (error.stderr?.toString() || '') + (error.message || '');
  
  // Check if Prisma wants to reset the database
  if (errorOutput.includes('reset') || 
      errorOutput.includes('All data will be lost') ||
      errorOutput.includes('We need to reset')) {
    logError('');
    logError('Prisma wants to reset the database. This is prevented for safety.');
    console.log('');
    logWarning('To apply migrations without resetting, use:');
    logInfo('  npm run db:migrate:deploy');
    console.log('');
    logWarning('If you must reset (WARNING: destroys all data), use:');
    logInfo('  npm run db:migrate:force');
    process.exit(1);
  }
  
  // Other errors
  logError('Migration failed:');
  console.error(errorOutput);
  process.exit(1);
}
