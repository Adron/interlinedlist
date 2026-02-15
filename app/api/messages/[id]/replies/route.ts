import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { serializeMessages } from '@/lib/messages/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/[id]/replies
 * Returns direct replies to a message. Visibility: only if the requester can see the parent.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: parentId } = await params;
    const user = await getCurrentUser();

    const parent = await prisma.message.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        userId: true,
        publiclyVisible: true,
        _count: { select: { replies: true } },
      },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const canSee = parent.publiclyVisible || (user?.id === parent.userId);
    if (!canSee) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const replies = await prisma.message.findMany({
      where: { parentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const serialized = serializeMessages(replies);
    const withReplyCount = serialized.map((r, i) => ({
      ...r,
      replyCount: replies[i]?._count?.replies ?? 0,
    }));

    return NextResponse.json(
      {
        replies: withReplyCount,
        total: replies.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get replies error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
