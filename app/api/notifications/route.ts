import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const TRAY_SCOPE = 'tray';

function serializeNotification(n: {
  id: string;
  title: string;
  body: string;
  actionUrl: string | null;
  type: string | null;
  metadata: unknown;
  createdAt: Date;
  readAt: Date | null;
}) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    actionUrl: n.actionUrl,
    type: n.type,
    metadata: n.metadata,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
  };
}

/**
 * GET /api/notifications?scope=tray — unread tray items + unreadCount for the bell.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = request.nextUrl.searchParams.get('scope');
    if (scope !== TRAY_SCOPE) {
      return NextResponse.json(
        { error: 'Invalid or missing scope (use scope=tray)' },
        { status: 400 }
      );
    }

    const trayLimit = user.notificationTrayLimit ?? 20;
    const take = Math.min(Math.max(trayLimit, 10), 40);

    const [unreadCount, items] = await Promise.all([
      prisma.userNotification.count({
        where: { userId: user.id, readAt: null },
      }),
      prisma.userNotification.findMany({
        where: { userId: user.id, readAt: null },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          title: true,
          body: true,
          actionUrl: true,
          type: true,
          metadata: true,
          createdAt: true,
          readAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      unreadCount,
      items: items.map(serializeNotification),
    });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
