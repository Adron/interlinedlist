import { prisma } from '@/lib/prisma';

/**
 * Get post with interaction counts and user interactions
 */
export async function getPostWithInteractions(
  postId: string,
  userId?: string
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      replyTo: {
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
          interactions: true,
          replies: true,
          reposts: true,
        },
      },
      interactions: userId
        ? {
            where: {
              userId,
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

  if (!post) {
    return null;
  }

  // Get interaction counts by type
  const likes = await prisma.postInteraction.count({
    where: { postId, interactionType: 'LIKE' },
  });

  const bookmarks = await prisma.postInteraction.count({
    where: { postId, interactionType: 'BOOKMARK' },
  });

  const reposts = await prisma.postInteraction.count({
    where: { postId, interactionType: 'REPOST' },
  });

  const replies = post._count.replies;

  // Get user's interactions
  const userInteractions = userId
    ? await prisma.postInteraction.findMany({
        where: {
          postId,
          userId,
        },
        select: {
          interactionType: true,
        },
      })
    : [];

  const liked = userInteractions.some((i) => i.interactionType === 'LIKE');
  const bookmarked = userInteractions.some(
    (i) => i.interactionType === 'BOOKMARK'
  );
  const reposted = userInteractions.some(
    (i) => i.interactionType === 'REPOST'
  );

  return {
    ...post,
    _count: {
      likes,
      bookmarks,
      reposts,
      replies,
    },
    userInteractions: {
      liked,
      bookmarked,
      reposted,
    },
  };
}

/**
 * Build feed query with pagination
 */
export async function buildFeedQuery(
  cursor?: string,
  limit: number = 20,
  userId?: string,
  hashtag?: string
) {
  const where: any = {};

  if (hashtag) {
    where.hashtags = {
      some: {
        hashtag: hashtag.toLowerCase(),
      },
    };
  }

  const posts = await prisma.post.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: {
      createdAt: 'desc',
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
      interactions: userId
        ? {
            where: {
              userId,
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

  const hasMore = posts.length > limit;
  const actualPosts = hasMore ? posts.slice(0, limit) : posts;

  // Get interaction counts for each post
  const postsWithCounts = await Promise.all(
    actualPosts.map(async (post) => {
      const likes = await prisma.postInteraction.count({
        where: { postId: post.id, interactionType: 'LIKE' },
      });

      const bookmarks = await prisma.postInteraction.count({
        where: { postId: post.id, interactionType: 'BOOKMARK' },
      });

      const reposts = await prisma.postInteraction.count({
        where: { postId: post.id, interactionType: 'REPOST' },
      });

      const replies = post._count.replies;

      const userInteractions = userId
        ? await prisma.postInteraction.findMany({
            where: {
              postId: post.id,
              userId,
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
        ...post,
        _count: {
          likes,
          bookmarks,
          reposts,
          replies,
        },
        userInteractions: {
          liked,
          bookmarked,
          reposted,
        },
      };
    })
  );

  return {
    posts: postsWithCounts,
    nextCursor: hasMore ? actualPosts[actualPosts.length - 1].id : undefined,
    hasMore,
  };
}

