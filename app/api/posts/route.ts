import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getUserFromRequest } from '@/lib/auth/middleware';
import {
  validatePostContent,
  extractMentions,
  extractHashtags,
  validateDSLScript,
} from '@/lib/posts/validation';
import { buildFeedQuery } from '@/lib/posts/queries';

// Get feed
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const cursor = searchParams.get('cursor') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const userId = searchParams.get('userId') || undefined;
    const hashtag = searchParams.get('hashtag') || undefined;

    // Get user if authenticated (optional)
    const user = getUserFromRequest(req);
    const feedUserId = userId || user?.userId;

    const result = await buildFeedQuery(
      cursor,
      limit,
      feedUserId,
      hashtag
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get feed error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create post
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const body = await req.json();
    const { content, dslScript, replyToId } = body;

    // Validate content
    const contentValidation = validatePostContent(content);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: contentValidation.error },
        { status: 400 }
      );
    }

    // Validate DSL script if provided
    if (dslScript) {
      const dslValidation = validateDSLScript(dslScript);
      if (!dslValidation.valid) {
        return NextResponse.json(
          { error: dslValidation.error },
          { status: 400 }
        );
      }
    }

    // Validate replyToId if provided
    if (replyToId) {
      const replyToPost = await prisma.post.findUnique({
        where: { id: replyToId },
      });
      if (!replyToPost) {
        return NextResponse.json(
          { error: 'Reply target post not found' },
          { status: 404 }
        );
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

    // Create post
    const post = await prisma.post.create({
      data: {
        userId: user.userId,
        content,
        dslScript: dslScript || null,
        replyToId: replyToId || null,
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
      },
    });

    // Create mentions
    if (mentionedUsers.length > 0) {
      await prisma.postMention.createMany({
        data: mentionedUsers.map((mentionedUser) => ({
          postId: post.id,
          mentionedUserId: mentionedUser.id,
        })),
      });
    }

    // Create hashtags
    if (hashtagStrings.length > 0) {
      await prisma.postHashtag.createMany({
        data: hashtagStrings.map((hashtag) => ({
          postId: post.id,
          hashtag,
        })),
      });
    }

    // Get full post with counts
    const fullPost = await prisma.post.findUnique({
      where: { id: post.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
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
        _count: {
          select: {
            replies: true,
            reposts: true,
          },
        },
      },
    });

    const likes = await prisma.postInteraction.count({
      where: { postId: post.id, interactionType: 'LIKE' },
    });

    const bookmarks = await prisma.postInteraction.count({
      where: { postId: post.id, interactionType: 'BOOKMARK' },
    });

    const reposts = await prisma.postInteraction.count({
      where: { postId: post.id, interactionType: 'REPOST' },
    });

    return NextResponse.json(
      {
        ...fullPost,
        _count: {
          likes,
          bookmarks,
          reposts,
          replies: fullPost!._count.replies,
        },
        userInteractions: {
          liked: false,
          bookmarked: false,
          reposted: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

