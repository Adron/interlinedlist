import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getCurrentUserOrSyncToken } from '@/lib/auth/sync-token';
import { deleteBlobsFromMessages } from '@/lib/blob';
import { deletePostOnBluesky, deletePostOnLinkedIn, deletePostOnMastodon } from '@/lib/crosspost/delete-external';
import { LinkMetadata } from '@/lib/types';
import { attachDugByMeIncludingPushed } from '@/lib/messages/dig';
import { getPushedMessageInclude } from '@/lib/messages/queries';
import { applyPushCountDecrementsForDeletedMessages } from '@/lib/messages/push';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    
    // Handle both sync and async params (Next.js 14+)
    const resolvedParams = params instanceof Promise ? await params : params;
    const messageId = resolvedParams.id;

    // Build where clause based on authentication
    let where: any = { id: messageId };

    if (user) {
      // Authenticated users see: their own messages (public or private) + all public messages
      where = {
        id: messageId,
        OR: [
          { userId: user.id }, // User's own messages
          { publiclyVisible: true }, // All public messages
        ],
      };
    } else {
      // Unauthenticated users see only public messages
      where = {
        id: messageId,
        publiclyVisible: true,
      };
    }

    // Fetch message with user data
    const message = await prisma.message.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        ...getPushedMessageInclude(),
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const pushed = message.pushedMessage;
    const serializedMessage = {
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

    const [withDug] = await attachDugByMeIncludingPushed([serializedMessage], user?.id);

    return NextResponse.json(withDug, { status: 200 });
  } catch (error) {
    console.error('Get message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const messageId = resolvedParams.id;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { userId: true, scheduledAt: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (message.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own messages' },
        { status: 403 }
      );
    }

    if (!message.scheduledAt || message.scheduledAt <= new Date()) {
      return NextResponse.json(
        { error: 'Can only edit scheduled posts that are in the future' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { scheduledAt: scheduledAtRaw, scheduledCrossPostConfig } = body;

    const updates: Record<string, unknown> = {};

    if (scheduledAtRaw !== undefined && scheduledAtRaw !== null && typeof scheduledAtRaw === 'string') {
      const parsed = new Date(scheduledAtRaw);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
      }
      if (parsed <= new Date()) {
        return NextResponse.json({ error: 'scheduledAt must be in the future' }, { status: 400 });
      }
      updates.scheduledAt = parsed;
    }

    if (scheduledCrossPostConfig !== undefined) {
      if (scheduledCrossPostConfig !== null && typeof scheduledCrossPostConfig !== 'object') {
        return NextResponse.json({ error: 'scheduledCrossPostConfig must be an object or null' }, { status: 400 });
      }
      const config = scheduledCrossPostConfig as {
        mastodonProviderIds?: string[];
        crossPostToBluesky?: boolean;
        crossPostToLinkedIn?: boolean;
      } | null;
      if (config) {
        updates.scheduledCrossPostConfig = {
          mastodonProviderIds: Array.isArray(config.mastodonProviderIds) ? config.mastodonProviderIds : [],
          crossPostToBluesky: Boolean(config.crossPostToBluesky),
          crossPostToLinkedIn: Boolean(config.crossPostToLinkedIn),
        };
      } else {
        updates.scheduledCrossPostConfig = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: updates,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    const serialized = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      scheduledAt: updated.scheduledAt?.toISOString() ?? null,
      linkMetadata: updated.linkMetadata as LinkMetadata | null,
      imageUrls: updated.imageUrls,
      videoUrls: updated.videoUrls,
      crossPostUrls: updated.crossPostUrls,
      scheduledCrossPostConfig: updated.scheduledCrossPostConfig,
    };

    return NextResponse.json(serialized, { status: 200 });
  } catch (error) {
    console.error('PATCH message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Handle both sync and async params (Next.js 14+)
    const resolvedParams = params instanceof Promise ? await params : params;
    const messageId = resolvedParams.id;

    console.log('Delete request for message ID:', messageId);

    // Find the message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { userId: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (message.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Fetch message and all descendants (replies at any depth) for blob + cross-post cleanup
    const allMessages: Array<{
      id: string;
      userId: string;
      imageUrls: unknown;
      videoUrls: unknown;
      crossPostUrls: unknown;
      pushedMessageId: string | null;
    }> = [];
    let idsToProcess = [messageId];
    while (idsToProcess.length > 0) {
      const batch = await prisma.message.findMany({
        where: { id: { in: idsToProcess } },
        select: {
          id: true,
          userId: true,
          imageUrls: true,
          videoUrls: true,
          crossPostUrls: true,
          pushedMessageId: true,
        },
      });
      allMessages.push(...batch);
      const childIds = await prisma.message.findMany({
        where: { parentId: { in: idsToProcess } },
        select: { id: true },
      });
      idsToProcess = childIds.map((c) => c.id);
    }

    // Delete cross-posts for messages we own (we have credentials only for current user)
    const messagesWeOwn = allMessages.filter((m) => m.userId === user.id);
    const linkedIdentities = await prisma.linkedIdentity.findMany({
      where: { userId: user.id },
      select: { id: true, provider: true, providerUsername: true, providerData: true },
    });
    const blueskyIdentity = linkedIdentities.find((i) => i.provider === 'bluesky');
    const linkedInIdentity = linkedIdentities.find((i) => i.provider === 'linkedin');
    const mastodonIdentities = linkedIdentities.filter((i) => i.provider.startsWith('mastodon:'));

    for (const m of messagesWeOwn) {
      const crossPostUrls = m.crossPostUrls as Array<{
        platform: string;
        url?: string;
        instanceName?: string;
        statusId?: string;
        statusIds?: string[];
        instanceUrl?: string;
        uri?: string;
        cid?: string;
        uris?: string[];
        postId?: string;
      }> | null;
      if (!crossPostUrls || !Array.isArray(crossPostUrls)) continue;

      for (const cp of crossPostUrls) {
        if (cp.platform === 'bluesky') {
          const uris = cp.uris ?? (cp.uri ? [cp.uri] : []);
          if (uris.length > 0 && blueskyIdentity) {
            await deletePostOnBluesky(
              blueskyIdentity as Parameters<typeof deletePostOnBluesky>[0],
              uris
            );
          }
        } else if (cp.platform === 'mastodon' && cp.instanceUrl) {
          const statusIds = cp.statusIds ?? (cp.statusId ? [cp.statusId] : []);
          if (statusIds.length > 0) {
            const match = mastodonIdentities.find(
              (i) =>
                i.provider.startsWith('mastodon:') &&
                cp.instanceUrl &&
                i.provider === `mastodon:${new URL(cp.instanceUrl).hostname}`
            );
            if (match) {
              await deletePostOnMastodon(
                match as Parameters<typeof deletePostOnMastodon>[0],
                cp.instanceUrl,
                statusIds
              );
            }
          }
        } else if (cp.platform === 'linkedin' && linkedInIdentity) {
          let postId = cp.postId;
          if (!postId && cp.url) {
            const match = cp.url.match(/\/feed\/update\/(.+)$/);
            postId = match ? decodeURIComponent(match[1]) : undefined;
          }
          if (postId) {
            await deletePostOnLinkedIn(
              linkedInIdentity as Parameters<typeof deletePostOnLinkedIn>[0],
              postId
            );
          }
        }
      }
    }

    // Delete blob assets for message and all descendants
    await deleteBlobsFromMessages(allMessages);

    try {
      await prisma.$transaction(async (tx) => {
        await applyPushCountDecrementsForDeletedMessages(tx, allMessages);
        await tx.message.delete({
          where: { id: messageId },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2003' || error.code === 'P2014')
      ) {
        return NextResponse.json(
          {
            error:
              'This message cannot be deleted while other posts still push it. Remove those pushes first.',
          },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { message: 'Message deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

