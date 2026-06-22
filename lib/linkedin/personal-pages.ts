import { prisma } from '@/lib/prisma';
import { fetchLinkedInAdminPages } from '@/lib/auth/oauth-linkedin';
import type { LinkedInPersonalPage } from '@prisma/client';

/**
 * Discovers the LinkedIn company pages the identity's owner administers and
 * syncs them into LinkedInPersonalPage rows.
 *
 * Reconciliation uses soft-delete semantics so that a user's posting-target
 * preferences survive transient admin-rights changes or LinkedIn API hiccups:
 *  - Pages returned by the API are upserted; if a previously-removed row
 *    reappears, its `removedAt` is cleared back to null.
 *  - Pages no longer returned have `removedAt` set to the current timestamp
 *    instead of being deleted.
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
    prisma.linkedInPersonalPage.updateMany({
      where: {
        identityId,
        linkedInPageId: { notIn: returnedPageIds },
        removedAt: null,
      },
      data: { removedAt: now },
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
          removedAt: null,
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
    where: { identityId, removedAt: null },
    orderBy: { pageName: 'asc' },
  });
}
