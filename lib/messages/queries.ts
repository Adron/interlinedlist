import { Prisma } from '@prisma/client';
import { Message } from '@/lib/types';
import { prisma } from '@/lib/prisma';

/**
 * Builds the where clause for message queries based on user authentication and viewing preference
 * @param userId - The current user's ID, or null if not authenticated
 * @param viewingPreference - The user's viewing preference ('all_messages', 'my_messages', 'following_only', 'followers_only')
 * @returns Prisma where clause object
 */
export async function buildMessageWhereClause(
  userId: string | null,
  viewingPreference: string | null = 'all_messages'
): Promise<Prisma.MessageWhereInput> {
  // Exclude scheduled messages that haven't been published yet (for others' messages only)
  const scheduledFilter = {
    OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
  };

  // Unauthenticated users see only public messages (published only)
  if (!userId) {
    return {
      publiclyVisible: true,
      ...scheduledFilter,
    };
  }

  // Handle different viewing preferences
  // Owner's own messages: no scheduledFilter (they see their scheduled posts)
  // Others' messages: apply scheduledFilter (only published)
  switch (viewingPreference) {
    case 'my_messages':
      // Show only the user's own messages (incl. scheduled)
      return { userId };

    case 'following_only': {
      // Show messages from users the current user follows (approved follows only)
      // For private accounts, followers only see public messages
      const following = await prisma.follow.findMany({
        where: {
          followerId: userId,
          status: 'approved',
        },
        select: {
          followingId: true,
          following: {
            select: {
              id: true,
              isPrivateAccount: true,
            },
          },
        },
      });

      if (following.length === 0) {
        // User follows no one, show only their own messages (incl. scheduled)
        return { userId };
      }

      const followingIds = following.map((f) => f.followingId);
      const privateAccountIds = following
        .filter((f) => f.following.isPrivateAccount)
        .map((f) => f.followingId);

      // Owner's messages (incl. scheduled) OR others' published messages
      return {
        OR: [
          { userId },
          {
            AND: [
              scheduledFilter,
              {
                userId: { in: followingIds },
                OR: [
                  {
                    userId: { in: privateAccountIds },
                    publiclyVisible: true,
                  },
                  {
                    userId: { in: followingIds.filter((id) => !privateAccountIds.includes(id)) },
                  },
                ],
              },
            ],
          },
        ],
      };
    }

    case 'followers_only': {
      // Show messages from users who follow the current user (approved follows only)
      // For private accounts, followers only see public messages
      const followers = await prisma.follow.findMany({
        where: {
          followingId: userId,
          status: 'approved',
        },
        select: {
          followerId: true,
          follower: {
            select: {
              id: true,
              isPrivateAccount: true,
            },
          },
        },
      });

      if (followers.length === 0) {
        // No followers, show only user's own messages (incl. scheduled)
        return { userId };
      }

      const followerIds = followers.map((f) => f.followerId);
      const privateAccountIds = followers
        .filter((f) => f.follower.isPrivateAccount)
        .map((f) => f.followerId);

      return {
        OR: [
          { userId },
          {
            AND: [
              scheduledFilter,
              {
                userId: { in: followerIds },
                OR: [
                  {
                    userId: { in: privateAccountIds },
                    publiclyVisible: true,
                  },
                  {
                    userId: { in: followerIds.filter((id) => !privateAccountIds.includes(id)) },
                  },
                ],
              },
            ],
          },
        ],
      };
    }

    case 'all_messages':
    default:
      // Owner's messages (incl. scheduled) OR others' published public messages
      return {
        OR: [
          { userId },
          { publiclyVisible: true, ...scheduledFilter },
        ],
      };
  }
}

/**
 * Builds the where clause for a user's "wall" of messages.
 * Owner sees all their messages; everyone else sees only public messages from that user.
 * @param profileUserId - The user whose wall we're viewing
 * @param viewerUserId - The current viewer's user ID, or null if not authenticated
 */
export function buildWallMessageWhereClause(
  profileUserId: string,
  viewerUserId: string | null
): Prisma.MessageWhereInput {
  const isOwner = viewerUserId === profileUserId;
  const scheduledFilter = {
    OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
  };
  return {
    userId: profileUserId,
    ...(isOwner ? {} : { publiclyVisible: true }),
    ...(isOwner ? {} : scheduledFilter), // Owner sees scheduled; others see only published
  };
}

/**
 * Standard user select fields for message queries
 * Ensures consistent user data structure across all message queries
 */
export function getMessageUserSelect(): Prisma.UserSelect {
  return {
    id: true,
    username: true,
    displayName: true,
    avatar: true,
  };
}

/** Nested source message for push / quote rows (one level). */
export function getPushedMessageInclude(): Prisma.MessageInclude {
  return {
    pushedMessage: {
      include: {
        user: { select: getMessageUserSelect() },
      },
    },
  };
}

/**
 * Serialize a single message's dates to ISO strings for client components
 */
export function serializeMessage<T extends { createdAt: Date; updatedAt?: Date }>(
  message: T
): Omit<T, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt?: string } {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
    ...(message.updatedAt && { updatedAt: message.updatedAt.toISOString() }),
  };
}

/**
 * Serialize multiple messages' dates to ISO strings
 */
export function serializeMessages<T extends { createdAt: Date; updatedAt?: Date }>(
  messages: T[]
): Array<Omit<T, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt?: string }> {
  return messages.map(serializeMessage);
}

