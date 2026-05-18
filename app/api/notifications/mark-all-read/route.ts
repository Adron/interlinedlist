import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserOrSyncToken } from '@/lib/auth/sync-token';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/mark-all-read — mark all unread notifications read for the current user.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const result = await prisma.userNotification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: now },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (error) {
    console.error('POST /api/notifications/mark-all-read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
