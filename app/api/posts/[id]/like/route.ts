import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth/middleware';

// Like post
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

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if like already exists
    const existingLike = await prisma.postInteraction.findUnique({
      where: {
        postId_userId_interactionType: {
          postId: id,
          userId: user.userId,
          interactionType: 'LIKE',
        },
      },
    });

    if (existingLike) {
      return NextResponse.json({ message: 'Post already liked' });
    }

    // Create like
    await prisma.postInteraction.create({
      data: {
        postId: id,
        userId: user.userId,
        interactionType: 'LIKE',
      },
    });

    // Get updated like count
    const likeCount = await prisma.postInteraction.count({
      where: { postId: id, interactionType: 'LIKE' },
    });

    return NextResponse.json({
      message: 'Post liked',
      liked: true,
      likeCount,
    });
  } catch (error) {
    console.error('Like post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Unlike post
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

    // Delete like
    await prisma.postInteraction.deleteMany({
      where: {
        postId: id,
        userId: user.userId,
        interactionType: 'LIKE',
      },
    });

    // Get updated like count
    const likeCount = await prisma.postInteraction.count({
      where: { postId: id, interactionType: 'LIKE' },
    });

    return NextResponse.json({
      message: 'Post unliked',
      liked: false,
      likeCount,
    });
  } catch (error) {
    console.error('Unlike post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

