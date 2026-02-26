import { prisma } from '@/lib/prisma';
import { hasIssuesScope } from '@/lib/auth/oauth-github';

export interface PublicLinkedIdentity {
  id: string;
  provider: string;
  providerUsername: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  connectedAt: Date;
  lastVerifiedAt: Date | null;
  /** True if GitHub identity has repo scope (issues, labels, assignees). Server-only. */
  hasIssuesScope?: boolean;
}

export async function getLinkedIdentitiesForUser(userId: string): Promise<PublicLinkedIdentity[]> {
  const identities = await prisma.linkedIdentity.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      providerUsername: true,
      profileUrl: true,
      avatarUrl: true,
      connectedAt: true,
      lastVerifiedAt: true,
      providerData: true,
    },
  });
  return identities.map((i) => {
    const { providerData, ...rest } = i;
    const result: PublicLinkedIdentity = { ...rest };
    if (i.provider === 'github' && providerData && typeof providerData === 'object') {
      const data = providerData as { scopes?: string };
      result.hasIssuesScope = hasIssuesScope(data.scopes);
    }
    return result;
  });
}
