#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { URL } = require('url');

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
 * Ensure BACKUP directory exists
 */
function ensureBackupDirectory(backupDir) {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    logSuccess(`Created BACKUP directory: ${backupDir}`);
  } else {
    logInfo(`BACKUP directory already exists: ${backupDir}`);
  }
  return backupDir;
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
 * Check if pg_dump is available
 */
function checkPgDump() {
  return new Promise((resolve, reject) => {
    exec('which pg_dump', (error) => {
      if (error) {
        // Try Windows alternative
        exec('where pg_dump', (winError) => {
          if (winError) {
            reject(new Error('pg_dump not found. Please install PostgreSQL client tools.'));
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

/**
 * Generate timestamp string for filename
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Execute pg_dump backup
 */
function backupDatabase(config, backupType, backupDir) {
  return new Promise((resolve, reject) => {
    const timestamp = getTimestamp();
    const filename = `backup_${backupType}_${timestamp}.sql`;
    const filepath = path.join(backupDir, filename);

    // Build pg_dump command
    // Use PGPASSWORD environment variable to avoid password prompt
    const env = {
      ...process.env,
      PGPASSWORD: config.password,
    };

    const command = `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -Fp --no-owner --no-acl > "${filepath}"`;

    logInfo(`Backing up ${backupType} database...`);
    logInfo(`  Host: ${config.host}:${config.port}`);
    logInfo(`  Database: ${config.database}`);
    logInfo(`  Output: ${filepath}`);

    exec(command, { env }, (error, stdout, stderr) => {
      if (error) {
        // pg_dump writes to stdout, so stderr might contain warnings
        // Check if file was created successfully
        if (fs.existsSync(filepath) && fs.statSync(filepath).size > 0) {
          logWarning(`pg_dump completed with warnings: ${stderr}`);
          resolve({ filepath, filename });
        } else {
          reject(new Error(`pg_dump failed: ${error.message}\n${stderr}`));
        }
      } else {
        // Check if file was created
        if (fs.existsSync(filepath)) {
          const stats = fs.statSync(filepath);
          logSuccess(`Backup completed: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);
          resolve({ filepath, filename });
        } else {
          reject(new Error('Backup file was not created'));
        }
      }
    });
  });
}

/**
 * Main function
 */
async function main() {
  log('\n==========================================');
  log('InterlinedList Database Backup');
  log('==========================================\n');

  try {
    // Check if pg_dump is available
    logInfo('Checking for pg_dump...');
    await checkPgDump();
    logSuccess('pg_dump found');

    // Get Downloads directory and create BACKUP folder
    const downloadsDir = getDownloadsDirectory();
    logInfo(`Downloads directory: ${downloadsDir}`);
    
    const backupDir = path.join(downloadsDir, 'BACKUP');
    ensureBackupDirectory(backupDir);

    const results = [];

    // Backup production database (.env)
    log('\n--- Production Database Backup ---');
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const databaseUrl = parseEnvFile(envPath);
      if (databaseUrl) {
        try {
          const config = parsePostgresUrl(databaseUrl);
          const result = await backupDatabase(config, 'production', backupDir);
          results.push({ type: 'production', ...result });
        } catch (error) {
          logError(`Failed to backup production database: ${error.message}`);
        }
      } else {
        logWarning('DATABASE_URL not found in .env file');
      }
    } else {
      logWarning('.env file not found, skipping production backup');
    }

    // Backup local development database (.env.local)
    log('\n--- Local Development Database Backup ---');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const databaseUrl = parseEnvFile(envLocalPath);
      if (databaseUrl) {
        try {
          const config = parsePostgresUrl(databaseUrl);
          const result = await backupDatabase(config, 'local', backupDir);
          results.push({ type: 'local', ...result });
        } catch (error) {
          logError(`Failed to backup local database: ${error.message}`);
        }
      } else {
        logWarning('DATABASE_URL not found in .env.local file');
      }
    } else {
      logWarning('.env.local file not found, skipping local backup');
    }

    // Summary
    log('\n==========================================');
    log('Backup Summary');
    log('==========================================');
    if (results.length > 0) {
      logSuccess(`Successfully backed up ${results.length} database(s):`);
      results.forEach(({ type, filename, filepath }) => {
        log(`  ${type}: ${filename}`, 'green');
        log(`    ${filepath}`, 'blue');
      });
    } else {
      logWarning('No backups were created');
    }
    log(`\nBackup directory: ${backupDir}\n`);

  } catch (error) {
    logError(`Backup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});

