import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function startOfDayUTC(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function endOfDayUTC(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(23, 59, 59, 999);
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';

    const now = new Date();
    let start: Date;
    let end: Date;

    switch (range) {
      case 'today':
        start = now; // Only future posts
        end = endOfDayUTC(now);
        break;
      case 'week':
        start = now;
        end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        start = now;
        end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const where = {
      userId: user.id,
      parentId: null,
      scheduledAt: { not: null, gte: start, lte: end },
    };

    const messages = await prisma.message.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const serialized = messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      scheduledAt: m.scheduledAt?.toISOString() ?? null,
      linkMetadata: m.linkMetadata,
      imageUrls: m.imageUrls,
      videoUrls: m.videoUrls,
      crossPostUrls: m.crossPostUrls,
      scheduledCrossPostConfig: m.scheduledCrossPostConfig,
    }));

    return NextResponse.json({ messages: serialized }, { status: 200 });
  } catch (error) {
    console.error('Get scheduled messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
