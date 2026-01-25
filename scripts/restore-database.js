#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { URL } = require('url');
const { promisify } = require('util');

const execAsync = promisify(exec);

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

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

/**
 * Get Downloads directory based on OS
 */
function getDownloadsDirectory() {
  const platform = os.platform();
  const homeDir = os.homedir();

  switch (platform) {
    case 'darwin': // macOS
      return path.join(homeDir, 'Downloads');
    case 'linux':
      // Check for XDG_DOWNLOAD_DIR first
      if (process.env.XDG_DOWNLOAD_DIR) {
        return process.env.XDG_DOWNLOAD_DIR;
      }
      return path.join(homeDir, 'Downloads');
    case 'win32': // Windows
      return path.join(homeDir, 'Downloads');
    default:
      // Fallback to Downloads in home directory
      return path.join(homeDir, 'Downloads');
  }
}

/**
 * Parse .env file and extract DATABASE_URL
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Match DATABASE_URL=value or DATABASE_URL="value" or DATABASE_URL='value'
    const match = trimmed.match(/^DATABASE_URL\s*=\s*(.+)$/);
    if (match) {
      let value = match[1].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      return value;
    }
  }

  return null;
}

/**
 * Parse PostgreSQL connection string
 */
function parsePostgresUrl(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is empty or undefined');
  }

  try {
    const url = new URL(databaseUrl);
    
    // Extract components
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1); // Remove leading '/'
    
    return {
      user,
      password,
      host,
      port,
      database,
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error.message}`);
  }
}

/**
 * Check if psql is available
 */
async function checkPsql() {
  try {
    await execAsync('which psql');
    return true;
  } catch (error) {
    try {
      await execAsync('where psql');
      return true;
    } catch (winError) {
      throw new Error('psql not found. Please install PostgreSQL client tools.');
    }
  }
}

/**
 * Find latest backup file for local development
 */
function findLatestLocalBackup(backupDir) {
  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory does not exist: ${backupDir}`);
  }

  const files = fs.readdirSync(backupDir);
  const localBackups = files
    .filter(file => file.startsWith('backup_local_') && file.endsWith('.sql'))
    .map(file => ({
      filename: file,
      filepath: path.join(backupDir, file),
      timestamp: extractTimestamp(file),
    }))
    .filter(backup => backup.timestamp !== null)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (localBackups.length === 0) {
    throw new Error('No local backup files found in backup directory');
  }

  return localBackups[0];
}

/**
 * Extract timestamp from backup filename
 * Format: backup_local_YYYY-MM-DD_HH-MM-SS.sql
 */
function extractTimestamp(filename) {
  const match = filename.match(/backup_local_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.sql/);
  if (!match) {
    return null;
  }

  const timestampStr = match[1].replace(/_/g, ' ');
  const parts = timestampStr.split(' ');
  const datePart = parts[0];
  const timePart = parts[1];

  try {
    return new Date(`${datePart}T${timePart}`);
  } catch (error) {
    return null;
  }
}

/**
 * Confirm with user before restoring
 */
function confirmRestore(backupFile, databaseName) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    logWarning(`\nThis will DROP and recreate the database: ${databaseName}`);
    logWarning(`Restoring from: ${backupFile.filename}`);
    logWarning(`Created: ${backupFile.timestamp.toLocaleString()}`);
    
    rl.question('\nAre you sure you want to continue? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Restore database from backup file
 */
async function restoreDatabase(config, backupFilepath) {
  logInfo('Restoring database...');
  logInfo(`  Host: ${config.host}:${config.port}`);
  logInfo(`  Database: ${config.database}`);
  logInfo(`  Backup file: ${backupFilepath}`);

  // Build psql command
  // Use PGPASSWORD environment variable to avoid password prompt
  const env = {
    ...process.env,
    PGPASSWORD: config.password,
  };

  // Read the backup file
  const backupContent = fs.readFileSync(backupFilepath, 'utf-8');

  // First, drop and recreate the database
  logInfo('Dropping existing database...');
  const dropCommand = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d postgres -c "DROP DATABASE IF EXISTS \\"${config.database}\\" WITH (FORCE);"`;
  
  try {
    await execAsync(dropCommand, { env });
    logSuccess('Database dropped');
  } catch (error) {
    // If database doesn't exist, that's okay
    if (error.message.includes('does not exist')) {
      logInfo('Database does not exist, skipping drop');
    } else {
      logWarning(`Warning during drop: ${error.message}`);
    }
  }

  // Create the database
  logInfo('Creating new database...');
  const createCommand = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d postgres -c "CREATE DATABASE \\"${config.database}\\";"`;
  
  try {
    await execAsync(createCommand, { env });
    logSuccess('Database created');
  } catch (error) {
    if (error.message.includes('already exists')) {
      logInfo('Database already exists');
    } else {
      throw new Error(`Failed to create database: ${error.message}`);
    }
  }

  // Restore from backup file
  logInfo('Restoring data from backup...');
  
  // Use cat/type to pipe file content to psql
  // This works cross-platform better than shell redirection
  const platform = os.platform();
  let restoreCommand;
  
  if (platform === 'win32') {
    // Windows: use type command
    restoreCommand = `type "${backupFilepath}" | psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database}`;
  } else {
    // Unix-like: use cat command
    restoreCommand = `cat "${backupFilepath}" | psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database}`;
  }
  
  try {
    const { stdout, stderr } = await execAsync(restoreCommand, { env });
    if (stderr && !stderr.includes('WARNING')) {
      logWarning(`Restore completed with warnings: ${stderr}`);
    } else {
      logSuccess('Database restored successfully');
    }
  } catch (error) {
    // psql may exit with non-zero code even on success if there are warnings
    // Check if the restore actually worked by checking for common error patterns
    if (error.message.includes('ERROR') && !error.message.includes('already exists')) {
      throw new Error(`Restore failed: ${error.message}`);
    } else {
      logWarning(`Restore completed with warnings: ${error.message}`);
      logInfo('Please verify the database was restored correctly');
    }
  }
}

/**
 * Main function
 */
async function main() {
  log('\n==========================================');
  log('InterlinedList Database Restore');
  log('==========================================\n');

  try {
    // Check if psql is available
    logInfo('Checking for psql...');
    await checkPsql();
    logSuccess('psql found');

    // Get backup directory
    const downloadsDir = getDownloadsDirectory();
    const backupDir = path.join(downloadsDir, 'BACKUP');
    
    if (!fs.existsSync(backupDir)) {
      throw new Error(`Backup directory does not exist: ${backupDir}\nPlease run backup-database.js first to create a backup.`);
    }

    logInfo(`Backup directory: ${backupDir}`);

    // Find latest local backup
    logInfo('Finding latest local backup...');
    const latestBackup = findLatestLocalBackup(backupDir);
    logSuccess(`Found backup: ${latestBackup.filename}`);
    logInfo(`Created: ${latestBackup.timestamp.toLocaleString()}`);

    // Get local database configuration
    logInfo('Reading local database configuration...');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    
    if (!fs.existsSync(envLocalPath)) {
      throw new Error('.env.local file not found. Cannot determine local database configuration.');
    }

    const databaseUrl = parseEnvFile(envLocalPath);
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in .env.local file');
    }

    const config = parsePostgresUrl(databaseUrl);
    logSuccess('Database configuration loaded');

    // Confirm restore
    const confirmed = await confirmRestore(latestBackup, config.database);
    if (!confirmed) {
      logInfo('Restore cancelled by user');
      process.exit(0);
    }

    // Restore database
    log('\n--- Restoring Database ---');
    await restoreDatabase(config, latestBackup.filepath);

    // Summary
    log('\n==========================================');
    log('Restore Summary');
    log('==========================================');
    logSuccess('Database restore completed');
    logInfo(`Restored from: ${latestBackup.filename}`);
    logInfo(`Database: ${config.database}`);
    logInfo(`Host: ${config.host}:${config.port}`);
    log('\nYou may need to run: npx prisma generate');
    log('to regenerate Prisma Client after restore.\n');

  } catch (error) {
    logError(`Restore failed: ${error.message}`);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
