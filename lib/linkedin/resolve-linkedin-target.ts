import { prisma } from '@/lib/prisma';
import type { LinkedInPostTarget } from './post-status';

/**
 * Resolves which LinkedIn credential and author URN to use for a given user.
 *
 * Resolution order:
 * 1. Active org-level page assignment (org credential + org page URN)
 * 2. User's personal LinkedIdentity for provider="linkedin"
 * 3. null — no LinkedIn credential available
 *
 * The org path is chosen when the user is assigned to an OrgLinkedInPage whose
 * credential is not soft-deleted and whose token has not expired.
 */
export async function resolveLinkedInTarget(userId: string): Promise<LinkedInPostTarget | null> {
  const now = new Date();

  const assignment = await prisma.orgLinkedInPageAssignment.findFirst({
    where: { userId },
    include: {
      page: {
        include: {
          credential: true,
        },
      },
    },
    orderBy: {
      page: {
        credential: {
          connectedAt: 'desc',
        },
      },
    },
  });

  if (assignment) {
    const { credential } = assignment.page;
    const isActive =
      credential.disconnectedAt === null &&
      (credential.expiresAt === null || credential.expiresAt > now);

    if (isActive) {
      return {
        accessToken: credential.accessToken,
        authorUrn: `urn:li:organization:${assignment.page.linkedInPageId}`,
        credentialId: credential.id,
      };
    }
  }

  const identity = await prisma.linkedIdentity.findFirst({
    where: { userId, provider: 'linkedin' },
    select: { id: true, providerUserId: true, providerData: true },
  });

  if (!identity) return null;

  const providerData = identity.providerData as { access_token?: string } | null;
  if (!providerData?.access_token) return null;

  return {
    accessToken: providerData.access_token,
    authorUrn: `urn:li:person:${identity.providerUserId}`,
    credentialId: identity.id,
  };
}
