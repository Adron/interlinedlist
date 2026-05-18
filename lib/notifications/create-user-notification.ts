import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/push/apns';

export type CreateUserNotificationInput = {
  userId: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  type?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Persist an in-app notification for a user. Call from server code (API routes, jobs, helpers).
 */
export async function createUserNotification(input: CreateUserNotificationInput) {
  const notification = await prisma.userNotification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
      type: input.type ?? null,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    },
  });

  // Fire-and-forget push delivery — never let APNs errors affect the caller
  sendPushToUser(input.userId, { title: input.title, body: input.body }).catch(() => {});

  return notification;
}
