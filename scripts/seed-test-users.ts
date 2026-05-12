/**
 * Upserts deterministic e2e test accounts into the database.
 * Credentials are read from env vars (see .env.example TEST_USER_* section).
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/seed-test-users.ts
 *
 * Safe to run repeatedly — uses upsert, so it will not create duplicates.
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FREE_EMAIL = process.env.TEST_USER_EMAIL ?? 'testuser@example.com';
const FREE_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'testpassword1';
const FREE_USERNAME = 'e2e_free_user';

const SUBSCRIBER_EMAIL = process.env.TEST_SUBSCRIBER_EMAIL ?? 'testsubscriber@example.com';
const SUBSCRIBER_PASSWORD = process.env.TEST_SUBSCRIBER_PASSWORD ?? 'testpassword2';
const SUBSCRIBER_USERNAME = 'e2e_subscriber';

async function seed() {
  const [freeHash, subHash] = await Promise.all([
    bcrypt.hash(FREE_PASSWORD, 10),
    bcrypt.hash(SUBSCRIBER_PASSWORD, 10),
  ]);

  const freeUser = await prisma.user.upsert({
    where: { email: FREE_EMAIL },
    update: { passwordHash: freeHash },
    create: {
      email: FREE_EMAIL,
      username: FREE_USERNAME,
      displayName: 'E2E Free User',
      passwordHash: freeHash,
      emailVerified: true,
      customerStatus: 'free',
    },
  });

  const subscriberUser = await prisma.user.upsert({
    where: { email: SUBSCRIBER_EMAIL },
    update: { passwordHash: subHash },
    create: {
      email: SUBSCRIBER_EMAIL,
      username: SUBSCRIBER_USERNAME,
      displayName: 'E2E Subscriber',
      passwordHash: subHash,
      emailVerified: true,
      customerStatus: 'subscriber:monthly',
    },
  });

  console.log(`✓ free user:       ${freeUser.email} (id: ${freeUser.id})`);
  console.log(`✓ subscriber user: ${subscriberUser.email} (id: ${subscriberUser.id})`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
