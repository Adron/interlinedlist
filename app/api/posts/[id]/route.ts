import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getUserFromRequest } from '@/lib/auth/middleware';
import {
  validatePostContent,
  extractMentions,
  extractHashtags,
  validateDSLScript,
} from '@/lib/posts/validation';
import { getPostWithInteractions } from '@/lib/posts/queries';

// Get single post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(req);

    const post = await getPostWithInteractions(id, user?.userId);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update post
export async function PUT(
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
    const body = await req.json();
    const { content, dslScript } = body;

    // Get post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only update your own posts' },
        { status: 403 }
      );
    }

    // Validate content
    const contentValidation = validatePostContent(content);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: contentValidation.error },
        { status: 400 }
      );
    }

    // Validate DSL script if provided
    if (dslScript !== undefined) {
      if (dslScript) {
        const dslValidation = validateDSLScript(dslScript);
        if (!dslValidation.valid) {
          return NextResponse.json(
            { error: dslValidation.error },
            { status: 400 }
          );
        }
      }
    }

    // Extract mentions and hashtags
    const mentionUsernames = extractMentions(content);
    const hashtagStrings = extractHashtags(content);

    // Verify mentioned users exist
    const mentionedUsers = await prisma.user.findMany({
      where: {
        username: {
          in: mentionUsernames,
        },
      },
      select: {
        id: true,
        username: true,
      },
    });

    // Update post
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        content,
        dslScript: dslScript !== undefined ? dslScript : post.dslScript,
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
      },
    });

    // Delete old mentions and hashtags
    await prisma.postMention.deleteMany({
      where: { postId: id },
    });
    await prisma.postHashtag.deleteMany({
      where: { postId: id },
    });

    // Create new mentions
    if (mentionedUsers.length > 0) {
      await prisma.postMention.createMany({
        data: mentionedUsers.map((mentionedUser) => ({
          postId: id,
          mentionedUserId: mentionedUser.id,
        })),
      });
    }

    // Create new hashtags
    if (hashtagStrings.length > 0) {
      await prisma.postHashtag.createMany({
        data: hashtagStrings.map((hashtag) => ({
          postId: id,
          hashtag,
        })),
      });
    }

    // Get full updated post
    const fullPost = await getPostWithInteractions(id, user.userId);

    return NextResponse.json(fullPost);
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete post
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

    // Get post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only delete your own posts' },
        { status: 403 }
      );
    }

    // Delete post (cascade deletes interactions, mentions, hashtags)
    await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

