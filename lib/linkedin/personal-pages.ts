import { prisma } from '@/lib/prisma';
import { fetchLinkedInAdminPages } from '@/lib/auth/oauth-linkedin';
import type { LinkedInPersonalPage } from '@prisma/client';

/**
 * Discovers the LinkedIn company pages the identity's owner administers and
 * syncs them into LinkedInPersonalPage rows: upserts every returned page and
 * deletes rows for pages no longer returned.
 *
 * Shared by the personal OAuth link callback and POST /api/linkedin/sync-pages.
 * Requires an access token granted with the rw_organization_admin scope.
 */
export async function syncLinkedInPersonalPages(
  identityId: string,
  accessToken: string
): Promise<LinkedInPersonalPage[]> {
  const pages = await fetchLinkedInAdminPages(accessToken);
  const now = new Date();
  const returnedPageIds = pages.map((page) => page.id);

  await prisma.$transaction([
    prisma.linkedInPersonalPage.deleteMany({
      where: { identityId, linkedInPageId: { notIn: returnedPageIds } },
    }),
    ...pages.map((page) =>
      prisma.linkedInPersonalPage.upsert({
        where: {
          identityId_linkedInPageId: { identityId, linkedInPageId: page.id },
        },
        update: {
          pageName: page.name,
          pageLogoUrl: page.logoUrl ?? null,
          lastSyncedAt: now,
        },
        create: {
          identityId,
          linkedInPageId: page.id,
          pageName: page.name,
          pageLogoUrl: page.logoUrl ?? null,
          lastSyncedAt: now,
        },
      })
    ),
  ]);

  return prisma.linkedInPersonalPage.findMany({
    where: { identityId },
    orderBy: { pageName: 'asc' },
  });
}
