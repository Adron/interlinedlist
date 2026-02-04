import { Prisma } from '@prisma/client';
import { Message } from '@/lib/types';

/**
 * Builds the where clause for message queries based on user authentication
 * @param userId - The current user's ID, or null if not authenticated
 * @returns Prisma where clause object
 */
export function buildMessageWhereClause(userId: string | null): Prisma.MessageWhereInput {
  if (userId) {
    // Authenticated users see: their own messages (public or private) + all public messages
    return {
      OR: [
        { userId }, // User's own messages
        { publiclyVisible: true }, // All public messages
      ],
    };
  } else {
    // Unauthenticated users see only public messages
    return {
      publiclyVisible: true,
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
  return {
    userId: profileUserId,
    ...(isOwner ? {} : { publiclyVisible: true }),
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

