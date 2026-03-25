import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const MAX_CANONICAL_HOPS = 32;

export type ResolveCanonicalPushError =
  | 'not_found'
  | 'not_public'
  | 'invalid_chain';

/**
 * Walk plain-push rows (empty content + pushedMessageId) to the embedded source.
 * The returned id is a publicly visible message that is not a plain-push shell.
 */
export async function resolveCanonicalPushTargetId(
  initialMessageId: string
): Promise<{ canonicalId: string } | { error: ResolveCanonicalPushError }> {
  let currentId = initialMessageId;

  for (let hop = 0; hop < MAX_CANONICAL_HOPS; hop++) {
    const row = await prisma.message.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        content: true,
        publiclyVisible: true,
        pushedMessageId: true,
      },
    });

    if (!row) {
      return { error: 'not_found' };
    }

    const isPlainPushShell =
      row.pushedMessageId != null && row.content.trim() === '';

    if (!isPlainPushShell) {
      if (!row.publiclyVisible) {
        return { error: 'not_public' };
      }
      return { canonicalId: row.id };
    }

    currentId = row.pushedMessageId!;
  }

  return { error: 'invalid_chain' };
}

/** Decrement pushCount on canonical messages for each deleted row that referenced them. */
export async function applyPushCountDecrementsForDeletedMessages(
  tx: Prisma.TransactionClient,
  messages: Array<{ pushedMessageId: string | null }>
): Promise<void> {
  const tallies = new Map<string, number>();
  for (const m of messages) {
    if (m.pushedMessageId) {
      tallies.set(m.pushedMessageId, (tallies.get(m.pushedMessageId) ?? 0) + 1);
    }
  }
  for (const [canonicalId, n] of tallies) {
    await tx.message.update({
      where: { id: canonicalId },
      data: { pushCount: { decrement: n } },
    });
    const snap = await tx.message.findUnique({
      where: { id: canonicalId },
      select: { pushCount: true },
    });
    if (snap && snap.pushCount < 0) {
      await tx.message.update({
        where: { id: canonicalId },
        data: { pushCount: 0 },
      });
    }
  }
}
