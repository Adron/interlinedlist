import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserOrSyncToken } from '@/lib/auth/sync-token';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/notifications/[id] — delete a notification owned by the current user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
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
      select: { id: true },
    });
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.userNotification.delete({ where: { id: row.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/notifications/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
