import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/bulk-delete
 * Delete multiple users (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.isAdministrator) {
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
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'userIds must contain valid strings' },
        { status: 400 }
      );
    }

    if (ids.includes(currentUser.id)) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const adminsToDelete = await prisma.administrator.count({
      where: { userId: { in: ids } },
    });
    const totalAdmins = await prisma.administrator.count();
    if (adminsToDelete >= totalAdmins) {
      return NextResponse.json(
        { error: 'Cannot delete the last administrator(s)' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.user.deleteMany({
        where: {
          id: { in: ids },
          NOT: { id: currentUser.id },
        },
      });
      return deleted.count;
    });

    return NextResponse.json({ deleted: result }, { status: 200 });
  } catch (error: any) {
    console.error('Bulk delete users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
