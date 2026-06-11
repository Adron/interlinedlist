import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: organizationId } = await params;
  const role = await getUserRoleInOrganization(organizationId, user.id);
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Admin or owner required' }, { status: 403 });
  }

  const body = await request.json() as { userId?: string; pageId?: string | null };
  const { userId, pageId } = body;

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  // Verify the target user is in this organization
  const targetRole = await getUserRoleInOrganization(organizationId, userId);
  if (!targetRole) {
    return NextResponse.json({ error: 'User is not a member of this organization' }, { status: 400 });
  }

  if (pageId === null || pageId === undefined || pageId === '') {
    // Remove assignment
    await prisma.orgLinkedInPageAssignment.deleteMany({
      where: {
        userId,
        page: {
          credential: { organizationId },
        },
      },
    });
    return NextResponse.json({ assigned: false });
  }

  // Verify the page belongs to this org's credential
  const page = await prisma.orgLinkedInPage.findFirst({
    where: {
      id: pageId,
      credential: { organizationId },
    },
  });
  if (!page) {
    return NextResponse.json({ error: 'Page not found in this organization' }, { status: 404 });
  }

  // Remove any existing assignment for this user under this org credential first
  await prisma.orgLinkedInPageAssignment.deleteMany({
    where: {
      userId,
      page: {
        credential: { organizationId },
      },
    },
  });

  const assignment = await prisma.orgLinkedInPageAssignment.create({
    data: {
      pageId,
      userId,
      assignedByUserId: user.id,
    },
  });

  return NextResponse.json({ assignment });
}
