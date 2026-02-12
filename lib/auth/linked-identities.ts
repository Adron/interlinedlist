import { prisma } from '@/lib/prisma';

export interface PublicLinkedIdentity {
  id: string;
  provider: string;
  providerUsername: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  connectedAt: Date;
  lastVerifiedAt: Date | null;
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
    },
  });
  return identities;
}
