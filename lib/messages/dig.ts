import { prisma } from '@/lib/prisma';
import { buildMessageWhereClause, buildWallMessageWhereClause } from '@/lib/messages/queries';

/**
 * Whether the viewer may dig this message (matches feed, profile wall, or reply-thread visibility).
 */
export async function canViewerDigMessage(
  viewerId: string,
  messageId: string
): Promise<boolean> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, userId: true, parentId: true },
  });
  if (!message) return false;

  if (message.parentId) {
    const parent = await prisma.message.findUnique({
      where: { id: message.parentId },
      select: { userId: true, publiclyVisible: true },
    });
    if (!parent) return false;
    return parent.publiclyVisible || parent.userId === viewerId;
  }

  const userWithPreference = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { viewingPreference: true },
  });
  const pref = userWithPreference?.viewingPreference ?? 'all_messages';
  const feedWhere = await buildMessageWhereClause(viewerId, pref);
  const viaFeed = await prisma.message.findFirst({
    where: { AND: [feedWhere, { id: messageId }] },
    select: { id: true },
  });
  if (viaFeed) return true;

  const wallWhere = buildWallMessageWhereClause(message.userId, viewerId);
  const viaWall = await prisma.message.findFirst({
    where: { AND: [wallWhere, { id: messageId }] },
    select: { id: true },
  });
  return !!viaWall;
}

export type DigMutationResult = { digCount: number; dugByMe: boolean };

export async function digMessage(userId: string, messageId: string): Promise<DigMutationResult> {
  return prisma.$transaction(async (tx) => {
    try {
      await tx.messageDig.create({
        data: { userId, messageId },
      });
      await tx.message.update({
        where: { id: messageId },
        data: { digCount: { increment: 1 } },
      });
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'P2002') {
        const msg = await tx.message.findUnique({
          where: { id: messageId },
          select: { digCount: true },
        });
        return { digCount: msg?.digCount ?? 0, dugByMe: true };
      }
      throw e;
    }
    const msg = await tx.message.findUnique({
      where: { id: messageId },
      select: { digCount: true },
    });
    return { digCount: msg?.digCount ?? 0, dugByMe: true };
  });
}

export async function undigMessage(
  userId: string,
  messageId: string
): Promise<DigMutationResult | null> {
  return prisma.$transaction(async (tx) => {
    const deleted = await tx.messageDig.deleteMany({
      where: { userId, messageId },
    });
    if (deleted.count === 0) {
      return null;
    }
    await tx.message.update({
      where: { id: messageId },
      data: { digCount: { decrement: 1 } },
    });
    let msg = await tx.message.findUnique({
      where: { id: messageId },
      select: { digCount: true },
    });
    if (msg && msg.digCount < 0) {
      await tx.message.update({
        where: { id: messageId },
        data: { digCount: 0 },
      });
      msg = { digCount: 0 };
    }
    return { digCount: msg?.digCount ?? 0, dugByMe: false };
  });
}

const messageIdsFromList = (messages: { id: string }[]) => messages.map((m) => m.id);

/**
 * For a list of messages, set dugByMe from a single batch query.
 */
export async function attachDugByMe<T extends { id: string }>(
  messages: T[],
  viewerId: string | null | undefined
): Promise<Array<T & { dugByMe: boolean }>> {
  if (!viewerId || messages.length === 0) {
    return messages.map((m) => ({ ...m, dugByMe: false }));
  }
  const ids = messageIdsFromList(messages);
  const digs = await prisma.messageDig.findMany({
    where: { userId: viewerId, messageId: { in: ids } },
    select: { messageId: true },
  });
  const dugSet = new Set(digs.map((d) => d.messageId));
  return messages.map((m) => ({ ...m, dugByMe: dugSet.has(m.id) }));
}
