import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';

// Load .env.local before Prisma client is instantiated
loadDotenv({ path: resolve(process.cwd(), '.env.local') });
loadDotenv({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL ?? 'testuser@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'testpassword1';
const TEST_SUBSCRIBER_EMAIL = process.env.TEST_SUBSCRIBER_EMAIL ?? 'testsubscriber@example.com';
const TEST_SUBSCRIBER_PASSWORD = process.env.TEST_SUBSCRIBER_PASSWORD ?? 'testpassword2';

export default async function globalSetup() {
  const prisma = new PrismaClient();

  try {
    const [freeHash, subHash] = await Promise.all([
      hash(TEST_USER_PASSWORD, 12),
      hash(TEST_SUBSCRIBER_PASSWORD, 12),
    ]);

    await prisma.user.upsert({
      where: { email: TEST_USER_EMAIL },
      update: { customerStatus: 'free' },
      create: {
        email: TEST_USER_EMAIL,
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: freeHash,
        emailVerified: true,
        customerStatus: 'free',
      },
    });

    await prisma.user.upsert({
      where: { email: TEST_SUBSCRIBER_EMAIL },
      update: { customerStatus: 'subscriber' },
      create: {
        email: TEST_SUBSCRIBER_EMAIL,
        username: 'testsubscriber',
        displayName: 'Test Subscriber',
        passwordHash: subHash,
        emailVerified: true,
        customerStatus: 'subscriber',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
