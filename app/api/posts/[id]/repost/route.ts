import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth/middleware';

// Repost
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { id } = await params;

    // Check if original post exists
    const originalPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!originalPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if repost already exists
    const existingRepost = await prisma.post.findFirst({
      where: {
        userId: user.userId,
        repostOfId: id,
      },
    });

    if (existingRepost) {
      return NextResponse.json({ message: 'Post already reposted' });
    }

    // Create repost post
    const repost = await prisma.post.create({
      data: {
        userId: user.userId,
        content: '',
        repostOfId: id,
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
        repostOf: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
            reposts: true,
          },
        },
      },
    });

    // Create repost interaction
    await prisma.postInteraction.create({
      data: {
        postId: id,
        userId: user.userId,
        interactionType: 'REPOST',
      },
    });

    // Get repost counts
    const likes = await prisma.postInteraction.count({
      where: { postId: repost.id, interactionType: 'LIKE' },
    });

    const bookmarks = await prisma.postInteraction.count({
      where: { postId: repost.id, interactionType: 'BOOKMARK' },
    });

    const reposts = await prisma.postInteraction.count({
      where: { postId: repost.id, interactionType: 'REPOST' },
    });

    return NextResponse.json({
      ...repost,
      _count: {
        likes,
        bookmarks,
        reposts,
        replies: repost._count.replies,
      },
      userInteractions: {
        liked: false,
        bookmarked: false,
        reposted: true,
      },
    });
  } catch (error) {
    console.error('Repost error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Unrepost
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { id } = await params;

    // Find repost post
    const repost = await prisma.post.findFirst({
      where: {
        userId: user.userId,
        repostOfId: id,
      },
    });

    if (!repost) {
      return NextResponse.json({ error: 'Repost not found' }, { status: 404 });
    }

    // Delete repost post
    await prisma.post.delete({
      where: { id: repost.id },
    });

    // Delete repost interaction
    await prisma.postInteraction.deleteMany({
      where: {
        postId: id,
        userId: user.userId,
        interactionType: 'REPOST',
      },
    });

    return NextResponse.json({
      message: 'Repost removed',
      reposted: false,
    });
  } catch (error) {
    console.error('Unrepost error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

