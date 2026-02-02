#!/usr/bin/env node

/**
 * Seed script to add test accounts to the localhost development database
 * 
 * This script reads test-accounts.json and creates user accounts in the database
 * with hashed passwords and GitHub avatar URLs.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

function logProgress(message) {
  log(message, 'cyan');
}

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Load test accounts from JSON file
 */
function loadTestAccounts() {
  const filePath = path.join(__dirname, 'test-accounts.json');
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test accounts file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const accounts = JSON.parse(fileContent);

  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('Test accounts file must contain a non-empty array');
  }

  return accounts;
}

/**
 * Check if a user already exists by username or email
 */
async function userExists(prisma, username, email) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  return existing;
}

/**
 * Create a single user account
 */
async function createAccount(prisma, accountData) {
  const { username, email, displayName, bio, avatar, password, emailVerified } = accountData;

  // Check if user already exists
  const existing = await userExists(prisma, username, email);
  if (existing) {
    return {
      success: false,
      skipped: true,
      username,
      reason: existing.username === username 
        ? `Username '${username}' already exists`
        : `Email '${email}' already exists`,
    };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        displayName: displayName || username,
        bio: bio || null,
        avatar: avatar || null,
        emailVerified: emailVerified !== undefined ? emailVerified : true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
      },
    });

    return {
      success: true,
      skipped: false,
      username,
      user,
    };
  } catch (error) {
    return {
      success: false,
      skipped: false,
      username,
      error: error.message,
    };
  }
}

/**
 * Main function
 */
async function main() {
  log('\n==========================================', 'cyan');
  log('Test Accounts Seeder', 'cyan');
  log('==========================================\n', 'cyan');

  // Load test accounts
  logInfo('Loading test accounts from test-accounts.json...');
  let accounts;
  try {
    accounts = loadTestAccounts();
    logSuccess(`Loaded ${accounts.length} test accounts`);
  } catch (error) {
    logError(`Failed to load test accounts: ${error.message}`);
    process.exit(1);
  }

  // Initialize Prisma client
  logInfo('Connecting to database...');
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    // Test database connection
    await prisma.$connect();
    logSuccess('Database connection established');

    // Process accounts
    logInfo(`\nProcessing ${accounts.length} accounts...\n`);
    
    const results = {
      created: [],
      skipped: [],
      errors: [],
    };

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const accountNum = i + 1;
      
      logProgress(`[${accountNum}/${accounts.length}] Processing ${account.username}...`);

      const result = await createAccount(prisma, account);

      if (result.success) {
        results.created.push(result);
        logSuccess(`  Created: ${result.user.displayName} (${result.user.email})`);
      } else if (result.skipped) {
        results.skipped.push(result);
        logWarning(`  Skipped: ${result.reason}`);
      } else {
        results.errors.push(result);
        logError(`  Error: ${result.error}`);
      }
    }

    // Print summary
    log('\n==========================================', 'cyan');
    log('Summary', 'cyan');
    log('==========================================\n', 'cyan');
    
    logSuccess(`Created: ${results.created.length} accounts`);
    if (results.skipped.length > 0) {
      logWarning(`Skipped: ${results.skipped.length} accounts (already exist)`);
    }
    if (results.errors.length > 0) {
      logError(`Errors: ${results.errors.length} accounts`);
      
      log('\nFailed accounts:', 'red');
      results.errors.forEach((error) => {
        log(`  - ${error.username}: ${error.error}`, 'red');
      });
    }

    log('\n==========================================', 'cyan');
    log('Default Password', 'cyan');
    log('==========================================\n', 'cyan');
    logInfo('All test accounts use the password: TestAccount123!');
    logInfo('All accounts are marked as email verified for easy testing.\n');

  } catch (error) {
    logError(`Database error: ${error.message}`);
    if (error.stack) {
      logError(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    logSuccess('Database connection closed');
  }
}

// Run the script
main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  if (error.stack) {
    logError(error.stack);
  }
  process.exit(1);
});
