import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createUserNotification } from '@/lib/notifications/create-user-notification';
import {
  NOTIFICATION_TYPE_MESSAGE_DIG,
  NOTIFICATION_TYPE_MESSAGE_PUSH_COMMENTARY,
  NOTIFICATION_TYPE_MESSAGE_PUSH_PLAIN,
} from '@/lib/notifications/constants';

const BODY_TRUNCATE = 2000;

function formatUtcLine(d: Date): string {
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function truncateForBody(text: string, max = BODY_TRUNCATE): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function actorLabel(username: string, displayName: string | null): string {
  return displayName ? `${displayName} (@${username})` : `@${username}`;
}

function threadPath(messageId: string): string {
  return `/message/${messageId}/thread`;
}

/**
 * Notify the message author when someone new digs their message (not on duplicate dig).
 */
export async function notifyMessageDig(params: {
  sourceMessageId: string;
  diggerId: string;
  digCreatedAt: Date;
}): Promise<void> {
  const { sourceMessageId, diggerId, digCreatedAt } = params;

  const [source, digger] = await Promise.all([
    prisma.message.findUnique({
      where: { id: sourceMessageId },
      select: {
        id: true,
        userId: true,
        content: true,
        createdAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: diggerId },
      select: { username: true, displayName: true },
    }),
  ]);

  if (!source || !digger) return;
  if (source.userId === diggerId) return;

  const fullContent = source.content;
  const bodyContent = truncateForBody(fullContent);
  const who = actorLabel(digger.username, digger.displayName);
  const title = `I Dig! on your message — ${who}`;
  const body = [
    `Your message:`,
    bodyContent,
    '',
    `Message posted: ${formatUtcLine(source.createdAt)}`,
    `I Dig! pressed: ${formatUtcLine(digCreatedAt)}`,
  ].join('\n');

  const metadata: Record<string, unknown> = {
    sourceMessageId: source.id,
    actorUserId: diggerId,
    eventAt: digCreatedAt.toISOString(),
    type: NOTIFICATION_TYPE_MESSAGE_DIG,
  };
  if (fullContent.length > BODY_TRUNCATE) metadata.fullSourceContent = fullContent;

  await createUserNotification({
    userId: source.userId,
    title,
    body,
    actionUrl: threadPath(source.id),
    type: NOTIFICATION_TYPE_MESSAGE_DIG,
    metadata: metadata as Prisma.InputJsonValue,
  });
}

/**
 * Notify the pushed message's author when someone pushes it (plain or with commentary).
 */
export async function notifyMessagePush(params: {
  sourceMessageId: string;
  pusherId: string;
  pushMessageCreatedAt: Date;
  pushContent: string;
}): Promise<void> {
  const { sourceMessageId, pusherId, pushMessageCreatedAt, pushContent } = params;

  const isPlain = pushContent.trim().length === 0;
  const type = isPlain
    ? NOTIFICATION_TYPE_MESSAGE_PUSH_PLAIN
    : NOTIFICATION_TYPE_MESSAGE_PUSH_COMMENTARY;

  const [source, pusher] = await Promise.all([
    prisma.message.findUnique({
      where: { id: sourceMessageId },
      select: {
        id: true,
        userId: true,
        content: true,
        createdAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: pusherId },
      select: { username: true, displayName: true },
    }),
  ]);

  if (!source || !pusher) return;
  if (source.userId === pusherId) return;

  const fullSource = source.content;
  const sourceExcerpt = truncateForBody(fullSource);
  const who = actorLabel(pusher.username, pusher.displayName);
  const title = isPlain
    ? `Pushed — ${who}`
    : `Pushed with Commentary — ${who}`;

  const lines = [
    `Your message:`,
    sourceExcerpt,
    '',
    `Message posted: ${formatUtcLine(source.createdAt)}`,
  ];
  if (!isPlain) {
    lines.push('', 'Their commentary:', truncateForBody(pushContent.trim()));
  }
  lines.push('', `Push posted: ${formatUtcLine(pushMessageCreatedAt)}`);

  const pushMeta: Record<string, unknown> = {
    sourceMessageId: source.id,
    actorUserId: pusherId,
    eventAt: pushMessageCreatedAt.toISOString(),
    type,
  };
  if (fullSource.length > BODY_TRUNCATE) pushMeta.fullSourceContent = fullSource;
  if (!isPlain) pushMeta.commentary = pushContent;

  await createUserNotification({
    userId: source.userId,
    title,
    body: lines.join('\n'),
    actionUrl: threadPath(source.id),
    type,
    metadata: pushMeta as Prisma.InputJsonValue,
  });
}
