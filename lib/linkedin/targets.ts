import { prisma } from '@/lib/prisma';
import type { LinkedInTargetOption } from '@/lib/types';

/**
 * Returns the LinkedIn destinations the user can post to right now:
 * the personal identity (when linked with an access token) plus org pages
 * with an active credential that the user is assigned to.
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
    select: { providerUsername: true, avatarUrl: true, providerData: true },
  });

  const providerData = identity?.providerData as { access_token?: string } | null | undefined;
  if (identity && providerData?.access_token) {
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

  for (const assignment of assignments) {
    const { credential } = assignment.page;
    const isActive =
      credential.disconnectedAt === null &&
      (credential.expiresAt === null || credential.expiresAt > now);
    if (!isActive) continue;
    targets.push({
      kind: 'orgPage',
      pageId: assignment.page.id,
      linkedInPageId: assignment.page.linkedInPageId,
      label: assignment.page.pageName,
      logoUrl: assignment.page.pageLogoUrl,
    });
  }

  return targets;
}
