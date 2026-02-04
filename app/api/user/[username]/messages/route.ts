import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { buildWallMessageWhereClause } from '@/lib/messages/queries';
import { getMessageUserSelect } from '@/lib/messages/queries';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const currentUser = await getCurrentUser();

    const profileUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!profileUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where = buildWallMessageWhereClause(profileUser.id, currentUser?.id ?? null);

    const messages = await prisma.message.findMany({
      where,
      include: {
        user: {
          select: getMessageUserSelect(),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.message.count({ where });

    return NextResponse.json(
      {
        messages,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get user messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
