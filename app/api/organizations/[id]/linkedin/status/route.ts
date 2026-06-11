import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: organizationId } = await params;
  const role = await getUserRoleInOrganization(organizationId, user.id);
  if (!role) return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });

  const credential = await prisma.orgLinkedInCredential.findUnique({
    where: { organizationId },
    include: {
      pages: {
        include: {
          assignments: {
            include: {
              user: { select: { id: true, username: true, displayName: true, avatar: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ credential, role });
}
