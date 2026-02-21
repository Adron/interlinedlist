#!/usr/bin/env node

/**
 * Seed script for initial database data
 * - Creates "The Public" organization
 * - Creates initial seed user "Adron"
 * - Adds seed user to "The Public" organization
 * 
 * Run with: node scripts/seed-initial-data.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const PUBLIC_ORG_ID = '00000000-0000-0000-0000-000000000001';

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

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Create "The Public" organization
 */
async function createPublicOrganization() {
  logInfo('Checking for "The Public" organization...');

  let publicOrg = await prisma.organization.findUnique({
    where: { id: PUBLIC_ORG_ID },
  });

  if (!publicOrg) {
    logInfo('Creating "The Public" organization...');
    publicOrg = await prisma.organization.create({
      data: {
        id: PUBLIC_ORG_ID,
        name: 'The Public',
        slug: 'the-public',
        description: 'The default public organization that all users belong to.',
        isPublic: true,
        isSystem: true,
      },
    });
    logSuccess('Created "The Public" organization');
  } else {
    logSuccess('"The Public" organization already exists');
  }

  return publicOrg;
}

/**
 * Create initial seed user "Adron"
 */
async function createSeedUser() {
  const seedUserEmail = 'adronhall@proton.me';
  const seedUsername = 'Adron';
  const seedPassword = 'changeme123'; // User should change this on first login

  logInfo(`Checking for seed user "${seedUsername}"...`);

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: seedUserEmail },
        { username: seedUsername },
      ],
    },
  });

  if (existingUser) {
    logSuccess(`Seed user "${seedUsername}" already exists`);
    return existingUser;
  }

  logInfo(`Creating seed user "${seedUsername}"...`);
  const passwordHash = await hashPassword(seedPassword);

  const user = await prisma.user.create({
    data: {
      email: seedUserEmail,
      username: seedUsername,
      passwordHash,
      displayName: 'Adron',
      emailVerified: true, // Set to true for initial seed user
    },
  });

  logSuccess(`Created seed user "${seedUsername}"`);
  logWarning(`Default password: ${seedPassword} (please change on first login)`);

  return user;
}

/**
 * Add user to "The Public" organization
 */
async function addUserToPublicOrganization(userId) {
  logInfo(`Adding user to "The Public" organization...`);

  const existing = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: PUBLIC_ORG_ID,
      },
    },
  });

  if (!existing) {
    await prisma.userOrganization.create({
      data: {
        userId,
        organizationId: PUBLIC_ORG_ID,
        role: 'owner',
      },
    });
    logSuccess('User added to "The Public" organization as owner');
  } else {
    logSuccess('User is already a member of "The Public" organization');
  }
}

/**
 * Add all existing users to "The Public" organization
 */
async function addAllUsersToPublicOrganization() {
  logInfo('Checking for users not in "The Public" organization...');

  const users = await prisma.user.findMany({
    select: { id: true },
  });

  let addedCount = 0;
  for (const user of users) {
    const existing = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: PUBLIC_ORG_ID,
        },
      },
    });

    if (!existing) {
      await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: PUBLIC_ORG_ID,
          role: 'member',
        },
      });
      addedCount++;
    }
  }

  if (addedCount > 0) {
    logSuccess(`Added ${addedCount} user(s) to "The Public" organization`);
  } else {
    logSuccess('All users are already members of "The Public" organization');
  }
}

/**
 * Main seed function
 */
async function seedInitialData() {
  try {
    log('\n==========================================', 'cyan');
    log('Seeding Initial Database Data', 'cyan');
    log('==========================================\n', 'cyan');

    // Create "The Public" organization
    await createPublicOrganization();

    // Create seed user
    const seedUser = await createSeedUser();

    // Add seed user to "The Public" organization
    await addUserToPublicOrganization(seedUser.id);

    // Add all existing users to "The Public" organization
    await addAllUsersToPublicOrganization();

    log('\n==========================================', 'cyan');
    logSuccess('Initial data seeding completed successfully!');
    log('==========================================\n', 'cyan');
  } catch (error) {
    logError('Error seeding initial data:');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedInitialData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedInitialData };
