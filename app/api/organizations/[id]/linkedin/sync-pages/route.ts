import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';
import { fetchLinkedInAdminPages } from '@/lib/auth/oauth-linkedin';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: organizationId } = await params;
  const role = await getUserRoleInOrganization(organizationId, user.id);
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Admin or owner required' }, { status: 403 });
  }

  const credential = await prisma.orgLinkedInCredential.findUnique({
    where: { organizationId },
  });
  if (!credential || credential.disconnectedAt) {
    return NextResponse.json({ error: 'No active LinkedIn credential for this organization' }, { status: 404 });
  }

  const pages = await fetchLinkedInAdminPages(credential.accessToken);
  const discoveredIds = pages.map((p) => p.id);

  for (const page of pages) {
    await prisma.orgLinkedInPage.upsert({
      where: {
        credentialId_linkedInPageId: {
          credentialId: credential.id,
          linkedInPageId: page.id,
        },
      },
      create: {
        credentialId: credential.id,
        linkedInPageId: page.id,
        pageName: page.name,
        pageLogoUrl: page.logoUrl ?? null,
        lastSyncedAt: new Date(),
      },
      update: {
        pageName: page.name,
        pageLogoUrl: page.logoUrl ?? null,
        lastSyncedAt: new Date(),
      },
    });
  }

  if (discoveredIds.length > 0) {
    await prisma.orgLinkedInPage.deleteMany({
      where: {
        credentialId: credential.id,
        linkedInPageId: { notIn: discoveredIds },
      },
    });
  }

  const updatedPages = await prisma.orgLinkedInPage.findMany({
    where: { credentialId: credential.id },
  });

  return NextResponse.json({ pages: updatedPages });
}
