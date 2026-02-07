/**
 * Seed script to ensure "The Public" organization exists and all users are members
 * 
 * NOTE: This script is kept for backward compatibility. For new setups, use:
 *   node scripts/seed-initial-data.js
 * 
 * This script only handles "The Public" organization and existing users.
 * The seed-initial-data.js script also creates the initial seed user "Adron".
 * 
 * Run with: node scripts/seed-public-organization.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PUBLIC_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function seedPublicOrganization() {
  try {
    console.log('Checking for "The Public" organization...');

    // Check if "The Public" organization exists
    let publicOrg = await prisma.organization.findUnique({
      where: { id: PUBLIC_ORG_ID },
    });

    if (!publicOrg) {
      console.log('Creating "The Public" organization...');
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
      console.log('✓ Created "The Public" organization');
    } else {
      console.log('✓ "The Public" organization already exists');
    }

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    console.log(`Found ${users.length} users`);

    // Add all users to "The Public" organization if they're not already members
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
      console.log(`✓ Added ${addedCount} users to "The Public" organization`);
    } else {
      console.log('✓ All users are already members of "The Public" organization');
    }

    console.log('✓ Seed completed successfully');
  } catch (error) {
    console.error('Error seeding public organization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedPublicOrganization();
