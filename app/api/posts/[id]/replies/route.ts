import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth/middleware';

// Get replies to post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const cursor = searchParams.get('cursor') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const user = getUserFromRequest(req);

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get replies
    const replies = await prisma.post.findMany({
      where: {
        replyToId: id,
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
            reposts: true,
          },
        },
        interactions: user
          ? {
              where: {
                userId: user.userId,
              },
              select: {
                interactionType: true,
              },
            }
          : false,
        mentions: {
          include: {
            mentionedUser: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        hashtags: true,
      },
    });

    const hasMore = replies.length > limit;
    const actualReplies = hasMore ? replies.slice(0, limit) : replies;

    // Get interaction counts for each reply
    const repliesWithCounts = await Promise.all(
      actualReplies.map(async (reply) => {
        const likes = await prisma.postInteraction.count({
          where: { postId: reply.id, interactionType: 'LIKE' },
        });

        const bookmarks = await prisma.postInteraction.count({
          where: { postId: reply.id, interactionType: 'BOOKMARK' },
        });

        const reposts = await prisma.postInteraction.count({
          where: { postId: reply.id, interactionType: 'REPOST' },
        });

        const replyCount = reply._count.replies;

        const userInteractions = user
          ? await prisma.postInteraction.findMany({
              where: {
                postId: reply.id,
                userId: user.userId,
              },
              select: {
                interactionType: true,
              },
            })
          : [];

        const liked = userInteractions.some(
          (i) => i.interactionType === 'LIKE'
        );
        const bookmarked = userInteractions.some(
          (i) => i.interactionType === 'BOOKMARK'
        );
        const reposted = userInteractions.some(
          (i) => i.interactionType === 'REPOST'
        );

        return {
          ...reply,
          _count: {
            likes,
            bookmarks,
            reposts,
            replies: replyCount,
          },
          userInteractions: {
            liked,
            bookmarked,
            reposted,
          },
        };
      })
    );

    return NextResponse.json({
      replies: repliesWithCounts,
      nextCursor: hasMore ? actualReplies[actualReplies.length - 1].id : undefined,
      hasMore,
    });
  } catch (error) {
    console.error('Get replies error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

