import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/notifications/[id]/read — mark one notification read (idempotent).
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = params instanceof Promise ? await params : params;
    const id = resolved.id;
    if (!id) {
      return NextResponse.json({ error: 'Notification id required' }, { status: 400 });
    }

    const row = await prisma.userNotification.findFirst({
      where: { id, userId: user.id },
      select: { id: true, readAt: true },
    });
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const now = new Date();
    if (!row.readAt) {
      await prisma.userNotification.update({
        where: { id: row.id },
        data: { readAt: now },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/notifications/[id]/read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
