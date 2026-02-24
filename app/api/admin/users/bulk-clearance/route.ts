import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAndPublicOwner } from '@/lib/auth/admin-access';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/users/bulk-clearance
 * Flip cleared status for each selected user (admin + Public owner only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await checkAdminAndPublicOwner();
    if (!currentUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds must be a non-empty array' },
        { status: 400 }
      );
    }

    const ids = userIds.filter((id: unknown) => typeof id === 'string');

    // Fetch current cleared status for each user, then flip
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, cleared: true },
    });

    let updated = 0;
    for (const u of users) {
      await prisma.user.update({
        where: { id: u.id },
        data: { cleared: !u.cleared },
      });
      updated++;
    }

    return NextResponse.json({ updated }, { status: 200 });
  } catch (error: any) {
    console.error('Bulk clearance update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
