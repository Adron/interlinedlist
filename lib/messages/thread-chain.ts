import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { attachDugByMeIncludingPushed } from '@/lib/messages/dig';
import { getMessageUserSelect } from '@/lib/messages/queries';
import { serializeMessageForClient } from '@/lib/messages/serialize-message-client';

const messageInclude = {
  user: {
    select: getMessageUserSelect(),
  },
  pushedMessage: {
    include: {
      user: { select: getMessageUserSelect() },
    },
  },
} satisfies Prisma.MessageInclude;

type ThreadMessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

function visibilityWhereForId(messageId: string, viewerId: string | undefined) {
  if (viewerId) {
    return {
      id: messageId,
      OR: [{ userId: viewerId }, { publiclyVisible: true }],
    };
  }
  return {
    id: messageId,
    publiclyVisible: true,
  };
}

/**
 * Load focal message and ancestors (root → focal) with the same visibility rules as GET /api/messages/[id].
 * Returns null if the focal message is missing or any parent in the chain is missing / not visible.
 */
export async function getMessageThreadChain(
  focalId: string,
  viewerId: string | undefined
) {
  const reversed: ThreadMessageRow[] = [];

  let currentId: string | null = focalId;
  const guard = new Set<string>();

  while (currentId) {
    if (guard.has(currentId)) {
      return null;
    }
    guard.add(currentId);

    const row: ThreadMessageRow | null = await prisma.message.findFirst({
      where: visibilityWhereForId(currentId, viewerId),
      include: messageInclude,
    });

    if (!row) {
      return null;
    }

    reversed.push(row);
    currentId = row.parentId;
  }

  const rootToFocal = reversed.reverse();

  const serialized = rootToFocal.map((m) =>
    serializeMessageForClient(m as unknown as Parameters<typeof serializeMessageForClient>[0])
  );

  return attachDugByMeIncludingPushed(serialized, viewerId);
}
