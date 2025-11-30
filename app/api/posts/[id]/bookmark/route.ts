import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth/middleware';

// Bookmark post
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

    // Check if bookmark already exists
    const existingBookmark = await prisma.postInteraction.findUnique({
      where: {
        postId_userId_interactionType: {
          postId: id,
          userId: user.userId,
          interactionType: 'BOOKMARK',
        },
      },
    });

    if (existingBookmark) {
      return NextResponse.json({ message: 'Post already bookmarked' });
    }

    // Create bookmark
    await prisma.postInteraction.create({
      data: {
        postId: id,
        userId: user.userId,
        interactionType: 'BOOKMARK',
      },
    });

    return NextResponse.json({
      message: 'Post bookmarked',
      bookmarked: true,
    });
  } catch (error) {
    console.error('Bookmark post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Unbookmark post
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

    // Delete bookmark
    await prisma.postInteraction.deleteMany({
      where: {
        postId: id,
        userId: user.userId,
        interactionType: 'BOOKMARK',
      },
    });

    return NextResponse.json({
      message: 'Post unbookmarked',
      bookmarked: false,
    });
  } catch (error) {
    console.error('Unbookmark post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

