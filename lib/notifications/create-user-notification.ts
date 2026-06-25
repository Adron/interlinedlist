import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/push/apns';
import { resolveChannelEnabled } from '@/lib/notifications/preferences';

export type CreateUserNotificationInput = {
  userId: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  type?: string | null;
  metadata?: Prisma.InputJsonValue;
  /**
   * When provided, delivery is gated by the user's notification preferences for
   * this event. When absent, both channels fire as before.
   */
  eventKey?: string;
};

/**
 * Persist an in-app notification for a user. Call from server code (API routes, jobs, helpers).
 */
export async function createUserNotification(input: CreateUserNotificationInput) {
  let allowInApp = true;
  let allowPush = true;

  if (input.eventKey) {
    const prefsRecord = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { notificationPreferences: true },
    });
    const prefs = prefsRecord?.notificationPreferences ?? null;
    allowInApp = resolveChannelEnabled(prefs, input.eventKey, 'inApp');
    allowPush = resolveChannelEnabled(prefs, input.eventKey, 'push');
  }

  const notification = allowInApp
    ? await prisma.userNotification.create({
        data: {
          userId: input.userId,
          title: input.title,
          body: input.body,
          actionUrl: input.actionUrl ?? null,
          type: input.type ?? null,
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        },
      })
    : null;

  // Fire-and-forget push delivery — never let APNs errors affect the caller
  if (allowPush) {
    sendPushToUser(input.userId, { title: input.title, body: input.body }).catch(() => {});
  }

  return notification;
}
