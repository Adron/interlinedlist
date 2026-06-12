import { prisma } from '@/lib/prisma';
import {
  getActiveLinkedInAccessToken,
  type LinkedInProviderData,
} from './provider-data';
import type { LinkedInTargetOption } from '@/lib/types';

/**
 * Returns the LinkedIn destinations the user can post to right now:
 * the personal identity (when linked with an access token), org pages with
 * an active credential that the user is assigned to, and company pages
 * discovered through the user's own LinkedIn connection (personal pages).
 *
 * When the same LinkedIn page is available both as an org page and as a
 * personal page, the org-page target wins (preserving existing behavior)
 * and the personal-page duplicate is skipped.
 *
 * Shared by GET /api/linkedin/targets and /api/linkedin/posting-targets.
 */
export async function getAvailableLinkedInTargets(
  userId: string
): Promise<LinkedInTargetOption[]> {
  const now = new Date();
  const targets: LinkedInTargetOption[] = [];

  const identity = await prisma.linkedIdentity.findFirst({
    where: { userId, provider: 'linkedin' },
    select: {
      providerUsername: true,
      avatarUrl: true,
      providerData: true,
      personalPages: { orderBy: { pageName: 'asc' } },
    },
  });

  const accessToken = getActiveLinkedInAccessToken(
    identity?.providerData as LinkedInProviderData | null | undefined
  );
  if (identity && accessToken) {
    targets.push({
      kind: 'personal',
      label: identity.providerUsername ?? 'LinkedIn',
      avatarUrl: identity.avatarUrl,
    });
  }

  const assignments = await prisma.orgLinkedInPageAssignment.findMany({
    where: { userId },
    include: {
      page: {
        include: {
          credential: true,
        },
      },
    },
  });

  const orgLinkedInPageIds = new Set<string>();
  for (const assignment of assignments) {
    const { credential } = assignment.page;
    const isActive =
      credential.disconnectedAt === null &&
      (credential.expiresAt === null || credential.expiresAt > now);
    if (!isActive) continue;
    orgLinkedInPageIds.add(assignment.page.linkedInPageId);
    targets.push({
      kind: 'orgPage',
      pageId: assignment.page.id,
      linkedInPageId: assignment.page.linkedInPageId,
      label: assignment.page.pageName,
      logoUrl: assignment.page.pageLogoUrl,
    });
  }

  if (identity && accessToken) {
    for (const page of identity.personalPages ?? []) {
      // Org credential path wins when the same LinkedIn page is reachable
      // through both connections.
      if (orgLinkedInPageIds.has(page.linkedInPageId)) continue;
      targets.push({
        kind: 'personalPage',
        personalPageId: page.id,
        linkedInPageId: page.linkedInPageId,
        label: page.pageName,
        logoUrl: page.pageLogoUrl,
      });
    }
  }

  return targets;
}
