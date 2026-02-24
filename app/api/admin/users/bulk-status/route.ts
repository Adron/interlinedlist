import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAndPublicOwner } from '@/lib/auth/admin-access';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/users/bulk-status
 * Set emailVerified for multiple users (admin + Public owner only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await checkAdminAndPublicOwner();
    if (!currentUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, emailVerified } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (typeof emailVerified !== 'boolean') {
      return NextResponse.json(
        { error: 'emailVerified must be a boolean' },
        { status: 400 }
      );
    }

    const ids = userIds.filter((id: unknown) => typeof id === 'string');

    const result = await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { emailVerified },
    });

    return NextResponse.json({ updated: result.count }, { status: 200 });
  } catch (error: any) {
    console.error('Bulk status update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
