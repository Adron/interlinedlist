import { LinkMetadata } from '@/lib/types';

type PushedMessageRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt: Date | null;
  linkMetadata: unknown;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
} & Record<string, unknown>;

/**
 * Prisma message row with `user` and optional `pushedMessage` (same shape as GET /api/messages/[id]).
 */
export type MessageRowWithUserAndPush = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt: Date | null;
  linkMetadata: unknown;
  pushedMessage?: PushedMessageRow | null;
} & Record<string, unknown>;

/**
 * Serialize dates and nested pushed message for client components / JSON APIs.
 */
export function serializeMessageForClient(message: MessageRowWithUserAndPush) {
  const pushed = message.pushedMessage ?? null;
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    scheduledAt: message.scheduledAt?.toISOString() ?? null,
    linkMetadata: message.linkMetadata as LinkMetadata | null,
    ...(pushed && {
      pushedMessage: {
        ...pushed,
        createdAt: pushed.createdAt.toISOString(),
        updatedAt: pushed.updatedAt.toISOString(),
        scheduledAt: pushed.scheduledAt?.toISOString() ?? null,
        linkMetadata: pushed.linkMetadata as LinkMetadata | null,
      },
    }),
  };
}
