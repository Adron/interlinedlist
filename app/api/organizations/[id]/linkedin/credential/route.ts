import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: organizationId } = await params;
  const role = await getUserRoleInOrganization(organizationId, user.id);
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Owner required to disconnect LinkedIn' }, { status: 403 });
  }

  const credential = await prisma.orgLinkedInCredential.findUnique({
    where: { organizationId },
  });
  if (!credential) {
    return NextResponse.json({ error: 'No LinkedIn credential found' }, { status: 404 });
  }

  await prisma.orgLinkedInCredential.update({
    where: { id: credential.id },
    data: { disconnectedAt: new Date() },
  });

  return NextResponse.json({ disconnected: true });
}
