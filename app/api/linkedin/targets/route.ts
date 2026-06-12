import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import type { LinkedInTargetOption } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const targets: LinkedInTargetOption[] = [];

  const identity = await prisma.linkedIdentity.findFirst({
    where: { userId: user.id, provider: 'linkedin' },
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
    where: { userId: user.id },
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

  return NextResponse.json({ targets });
}
