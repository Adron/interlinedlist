/**
 * Follow Queries
 * 
 * Query utilities for managing follower/following relationships
 */

import { prisma } from '@/lib/prisma';
import { FollowStatus } from '@/lib/types';

export interface PaginationParams {
  limit?: number;
  offset?: number;
  status?: FollowStatus;
}

/**
 * Follow a user (creates pending request if private account, approved if public)
 * Prevents self-follows
 */
export async function followUser(followerId: string, followingId: string) {
  // Prevent self-follows
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself');
  }

  // Check if follow relationship already exists
  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  if (existingFollow) {
    return existingFollow;
  }

  // Check if the user being followed has a private account
  const followingUser = await prisma.user.findUnique({
    where: { id: followingId },
    select: { isPrivateAccount: true },
  });

  if (!followingUser) {
    throw new Error('User not found');
  }

  // Determine status based on account privacy
  const status: FollowStatus = followingUser.isPrivateAccount ? 'pending' : 'approved';

  return await prisma.follow.create({
    data: {
      followerId,
      followingId,
      status,
    },
  });
}

/**
 * Unfollow a user (removes follow relationship)
 */
export async function unfollowUser(followerId: string, followingId: string) {
  return await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId,
    },
  });
}

/**
 * Remove a follower (only callable by the user being followed)
 */
export async function removeFollower(followerId: string, followingId: string) {
  return await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId,
    },
  });
}

/**
 * Approve a pending follow request
 */
export async function approveFollowRequest(followerId: string, followingId: string) {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  if (!follow) {
    throw new Error('Follow request not found');
  }

  if (follow.status !== 'pending') {
    throw new Error('Follow request is not pending');
  }

  return await prisma.follow.update({
    where: {
      id: follow.id,
    },
    data: {
      status: 'approved',
    },
  });
}

/**
 * Reject a pending follow request
 */
export async function rejectFollowRequest(followerId: string, followingId: string) {
  return await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId,
      status: 'pending',
    },
  });
}

/**
 * Get list of users following a user
 */
export async function getFollowers(userId: string, options: PaginationParams = {}) {
  const { limit = 50, offset = 0, status } = options;

  const where: any = {
    followingId: userId,
  };

  if (status) {
    where.status = status;
  }

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      where,
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.follow.count({ where }),
  ]);

  return {
    followers: follows.map((f) => ({
      ...f.follower,
      followId: f.id,
      status: f.status as FollowStatus,
      createdAt: f.createdAt,
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

/**
 * Get list of users a user is following
 */
export async function getFollowing(userId: string, options: PaginationParams = {}) {
  const { limit = 50, offset = 0, status } = options;

  const where: any = {
    followerId: userId,
  };

  if (status) {
    where.status = status;
  }

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      where,
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.follow.count({ where }),
  ]);

  return {
    following: follows.map((f) => ({
      ...f.following,
      followId: f.id,
      status: f.status as FollowStatus,
      createdAt: f.createdAt,
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

/**
 * Get follow status between two users
 */
export async function getFollowStatus(followerId: string, followingId: string): Promise<FollowStatus | null> {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  return follow ? (follow.status as FollowStatus) : null;
}

/**
 * Get pending follow requests for a user
 */
export async function getFollowRequests(userId: string) {
  const follows = await prisma.follow.findMany({
    where: {
      followingId: userId,
      status: 'pending',
    },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return follows.map((f) => ({
    ...f.follower,
    followId: f.id,
    createdAt: f.createdAt,
  }));
}

/**
 * Get follower/following counts for a user
 */
export async function getFollowCounts(userId: string) {
  const [followers, following, pendingRequests] = await Promise.all([
    prisma.follow.count({
      where: {
        followingId: userId,
        status: 'approved',
      },
    }),
    prisma.follow.count({
      where: {
        followerId: userId,
        status: 'approved',
      },
    }),
    prisma.follow.count({
      where: {
        followingId: userId,
        status: 'pending',
      },
    }),
  ]);

  return {
    followers,
    following,
    pendingRequests,
  };
}

/**
 * Get list of users that both users follow (mutual follows)
 */
export async function getMutualFollows(userId: string, otherUserId: string) {
  // Get users that userId follows
  const userFollowing = await prisma.follow.findMany({
    where: {
      followerId: userId,
      status: 'approved',
    },
    select: {
      followingId: true,
    },
  });

  const userFollowingIds = userFollowing.map((f) => f.followingId);

  if (userFollowingIds.length === 0) {
    return [];
  }

  // Get users that otherUserId follows and are also followed by userId
  const mutualFollows = await prisma.follow.findMany({
    where: {
      followerId: otherUserId,
      followingId: {
        in: userFollowingIds,
      },
      status: 'approved',
    },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
  });

  return mutualFollows.map((f) => f.following);
}
