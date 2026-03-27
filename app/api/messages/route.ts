import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserOrSyncToken } from '@/lib/auth/sync-token';
import { isSubscriber } from '@/lib/subscription/is-subscriber';
import { detectLinks } from '@/lib/messages/link-detector';
import { APP_URL } from '@/lib/config/app';
import { buildMessageWhereClause, getPushedMessageInclude } from '@/lib/messages/queries';
import { attachDugByMeIncludingPushed } from '@/lib/messages/dig';
import { postToMastodon } from '@/lib/mastodon/post-status';
import { postToBluesky } from '@/lib/bluesky/post-status';
import { postToLinkedIn } from '@/lib/linkedin/post-status';
import { trackAction } from '@/lib/analytics/track';
import { resolveCanonicalPushTargetId } from '@/lib/messages/push';
import { notifyMessagePush } from '@/lib/notifications/message-engagement';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Email verification required. Please verify your email address before posting messages.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      content,
      publiclyVisible,
      imageUrls,
      videoUrls,
      mastodonProviderIds,
      crossPostToBluesky,
      crossPostToLinkedIn,
      parentId,
      scheduledAt: scheduledAtRaw,
      pushedMessageId: pushedMessageIdRaw,
    } = body;

    const userWithSettings = await prisma.user.findUnique({
      where: { id: user.id },
      select: { maxMessageLength: true, defaultPubliclyVisible: true },
    });
    const maxLength = userWithSettings?.maxMessageLength || 666;
    const defaultPubliclyVisible = userWithSettings?.defaultPubliclyVisible ?? false;

    const hasCrossPost =
      (Array.isArray(mastodonProviderIds) && mastodonProviderIds.length > 0) ||
      crossPostToBluesky === true ||
      crossPostToLinkedIn === true;
    const hasImages =
      imageUrls !== undefined && imageUrls !== null && Array.isArray(imageUrls) && imageUrls.length > 0;
    const hasVideo =
      videoUrls !== undefined && videoUrls !== null && Array.isArray(videoUrls) && videoUrls.length > 0;
    const hasSchedule =
      scheduledAtRaw !== undefined && scheduledAtRaw !== null && typeof scheduledAtRaw === 'string';

    const hasPush =
      typeof pushedMessageIdRaw === 'string' && pushedMessageIdRaw.trim().length > 0;

    if (parentId && typeof parentId === 'string' && parentId.trim() && hasPush) {
      return NextResponse.json(
        { error: 'Cannot reply and push in the same message' },
        { status: 400 }
      );
    }

    let canonicalPushTargetId: string | null = null;

    if (hasPush) {
      const resolved = await resolveCanonicalPushTargetId(pushedMessageIdRaw.trim());
      if ('error' in resolved) {
        if (resolved.error === 'not_found') {
          return NextResponse.json({ error: 'Message to push was not found' }, { status: 404 });
        }
        if (resolved.error === 'not_public') {
          return NextResponse.json(
            { error: 'You can only push publicly visible messages' },
            { status: 403 }
          );
        }
        return NextResponse.json({ error: 'Invalid push target' }, { status: 400 });
      }
      canonicalPushTargetId = resolved.canonicalId;

      if (hasSchedule) {
        return NextResponse.json({ error: 'Push messages cannot be scheduled' }, { status: 400 });
      }

      const pushContentTrim = typeof content === 'string' ? content.trim() : '';
      const isPlainPush = pushContentTrim.length === 0;
      if (isPlainPush && (hasImages || hasVideo || hasCrossPost)) {
        return NextResponse.json(
          {
            error:
              'Plain Push Message does not support images, video, or cross-posting. Use Push Message & Add Comment for media or cross-post (subscription required where applicable).',
          },
          { status: 400 }
        );
      }
    }

    if ((hasCrossPost || hasImages || hasVideo || hasSchedule) && !isSubscriber(user.customerStatus)) {
      return NextResponse.json(
        { error: 'Subscribe to unlock images, video, cross-posting, and scheduled posts.' },
        { status: 403 }
      );
    }

    let finalContent: string;
    if (hasPush) {
      const t = typeof content === 'string' ? content.trim() : '';
      if (t.length === 0) {
        finalContent = '';
      } else {
        finalContent = t;
        if (finalContent.length > maxLength) {
          return NextResponse.json(
            { error: `Message exceeds maximum length of ${maxLength} characters` },
            { status: 400 }
          );
        }
      }
    } else {
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
      }
      finalContent = content.trim();
      if (finalContent.length > maxLength) {
        return NextResponse.json(
          { error: `Message exceeds maximum length of ${maxLength} characters` },
          { status: 400 }
        );
      }
    }

    if (canonicalPushTargetId && publiclyVisible === false) {
      return NextResponse.json(
        { error: 'Push messages must be public' },
        { status: 400 }
      );
    }

    const finalPubliclyVisible = canonicalPushTargetId
      ? true
      : publiclyVisible !== undefined
        ? Boolean(publiclyVisible)
        : defaultPubliclyVisible;

    // Validate imageUrls if provided (1-8 URLs)
    let finalImageUrls: string[] | undefined;
    if (imageUrls !== undefined && imageUrls !== null) {
      if (!Array.isArray(imageUrls)) {
        return NextResponse.json({ error: 'imageUrls must be an array' }, { status: 400 });
      }
      if (imageUrls.length > 8) {
        return NextResponse.json({ error: 'At most 8 images per message' }, { status: 400 });
      }
      const urls = imageUrls.filter((u: unknown) => typeof u === 'string' && u.length > 0);
      if (urls.length !== imageUrls.length) {
        return NextResponse.json({ error: 'Each imageUrl must be a non-empty string' }, { status: 400 });
      }
      finalImageUrls = urls.length > 0 ? urls : undefined;
    }

    // Validate videoUrls if provided (0 or 1 URL)
    let finalVideoUrls: string[] | undefined;
    if (videoUrls !== undefined && videoUrls !== null) {
      if (!Array.isArray(videoUrls)) {
        return NextResponse.json({ error: 'videoUrls must be an array' }, { status: 400 });
      }
      if (videoUrls.length > 1) {
        return NextResponse.json({ error: 'At most 1 video per message' }, { status: 400 });
      }
      const urls = videoUrls.filter((u: unknown) => typeof u === 'string' && u.length > 0);
      if (urls.length !== videoUrls.length) {
        return NextResponse.json({ error: 'Each videoUrl must be a non-empty string' }, { status: 400 });
      }
      finalVideoUrls = urls.length > 0 ? urls : undefined;
    }

    // Parse and validate scheduledAt if provided (pushes cannot be scheduled)
    let scheduledAt: Date | undefined;
    if (
      !hasPush &&
      scheduledAtRaw !== undefined &&
      scheduledAtRaw !== null &&
      typeof scheduledAtRaw === 'string'
    ) {
      const parsed = new Date(scheduledAtRaw);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
      }
      if (parsed <= new Date()) {
        return NextResponse.json({ error: 'scheduledAt must be in the future' }, { status: 400 });
      }
      scheduledAt = parsed;
    }

    // Reply: validate parent and visibility
    let parentMessage: { id: string; userId: string; publiclyVisible: boolean; crossPostUrls: unknown } | null = null;
    if (!hasPush && parentId && typeof parentId === 'string' && parentId.trim()) {
      parentMessage = await prisma.message.findUnique({
        where: { id: parentId.trim() },
        select: { id: true, userId: true, publiclyVisible: true, crossPostUrls: true },
      });
      if (!parentMessage) {
        return NextResponse.json({ error: 'Parent message not found' }, { status: 404 });
      }
      const canReply = parentMessage.publiclyVisible || parentMessage.userId === user.id;
      if (!canReply) {
        return NextResponse.json({ error: 'You cannot reply to this message' }, { status: 403 });
      }
    }

    const isScheduled = !!scheduledAt && !parentMessage && !canonicalPushTargetId;

    let message;
    try {
      message = await prisma.$transaction(async (tx) => {
        const msg = await tx.message.create({
          data: {
            content: finalContent,
            publiclyVisible: finalPubliclyVisible,
            userId: user.id,
            ...(parentMessage && { parentId: parentMessage.id }),
            ...(canonicalPushTargetId && { pushedMessageId: canonicalPushTargetId }),
            ...(finalImageUrls !== undefined && { imageUrls: finalImageUrls }),
            ...(finalVideoUrls !== undefined && { videoUrls: finalVideoUrls }),
            ...(scheduledAt && { scheduledAt }),
            ...(isScheduled && {
              scheduledCrossPostConfig: {
                mastodonProviderIds: Array.isArray(mastodonProviderIds) ? mastodonProviderIds : [],
                crossPostToBluesky: crossPostToBluesky === true,
                crossPostToLinkedIn: crossPostToLinkedIn === true,
              } as object,
            }),
          },
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
        if (canonicalPushTargetId) {
          await tx.message.update({
            where: { id: canonicalPushTargetId },
            data: { pushCount: { increment: 1 } },
          });
        }
        return msg;
      });
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'P2002') {
        return NextResponse.json({ error: 'You already pushed this message' }, { status: 409 });
      }
      throw error;
    }

    trackAction('message_post', { userId: user.id }).catch(() => {});

    if (canonicalPushTargetId && message.createdAt) {
      notifyMessagePush({
        sourceMessageId: canonicalPushTargetId,
        pusherId: user.id,
        pushMessageCreatedAt: message.createdAt,
        pushContent: finalContent,
      }).catch((err) => console.error('notifyMessagePush:', err));
    }

    // Detect links and trigger async metadata fetch (don't await)
    const detectedLinks = finalContent ? detectLinks(finalContent) : [];
    if (detectedLinks.length > 0) {
      // Get base URL from request or use APP_URL
      const baseUrl = request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
        : APP_URL;
      
      // Trigger metadata fetch asynchronously without blocking response
      fetch(`${baseUrl}/api/messages/${message.id}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch((error) => {
        // Silently handle errors - metadata fetch failures shouldn't affect message creation
        console.error('Failed to trigger metadata fetch:', error);
      });
    }

    // Cross-post to selected Mastodon accounts (skip for replies, skip for scheduled - cron will handle)
    const crossPostResults: Array<{ providerId: string; instanceName: string; success: boolean; url?: string; error?: string }> = [];
    const crossPostUrls: Array<{ platform: string; url: string; instanceName: string; statusId?: string; statusIds?: string[]; instanceUrl?: string; uri?: string; cid?: string; uris?: string[] }> = [];
    const providerIds =
      !parentMessage &&
      !canonicalPushTargetId &&
      !isScheduled &&
      Array.isArray(mastodonProviderIds)
      ? mastodonProviderIds.filter((id: unknown) => typeof id === 'string')
      : [];

    if (providerIds.length > 0) {
      const identities = await prisma.linkedIdentity.findMany({
        where: {
          id: { in: providerIds },
          userId: user.id,
          provider: { startsWith: 'mastodon:' },
        },
        select: {
          id: true,
          provider: true,
          providerUsername: true,
          providerData: true,
        },
      });

      for (const identity of identities) {
        const result = await postToMastodon(
          identity as { id: string; provider: string; providerUsername: string | null; providerData: { access_token: string; instance_url: string } | null },
          {
            content: finalContent,
            publiclyVisible: finalPubliclyVisible as boolean,
            imageUrls: finalImageUrls,
            videoUrls: finalVideoUrls,
          }
        );
        crossPostResults.push(result);
        if (result.success && result.url) {
          crossPostUrls.push({
            platform: 'mastodon',
            url: result.url,
            instanceName: result.instanceName,
            ...(result.statusId && { statusId: result.statusId }),
            ...(result.statusIds && { statusIds: result.statusIds }),
            ...(result.instanceUrl && { instanceUrl: result.instanceUrl }),
          });
        }
      }
    }

    // Cross-post to Bluesky if enabled (skip for replies, pushes, scheduled)
    if (!parentMessage && !canonicalPushTargetId && !isScheduled && crossPostToBluesky === true) {
      const blueskyIdentity = await prisma.linkedIdentity.findFirst({
        where: {
          userId: user.id,
          provider: 'bluesky',
        },
        select: {
          id: true,
          provider: true,
          providerUsername: true,
          providerData: true,
        },
      });

      if (blueskyIdentity) {
        const result = await postToBluesky(blueskyIdentity as Parameters<typeof postToBluesky>[0], {
          content: finalContent,
          publiclyVisible: finalPubliclyVisible as boolean,
          imageUrls: finalImageUrls,
          videoUrls: finalVideoUrls,
        });
        crossPostResults.push(result);
        if (result.success && result.url) {
          crossPostUrls.push({
            platform: 'bluesky',
            url: result.url,
            instanceName: 'Bluesky',
            ...(result.uri && { uri: result.uri }),
            ...(result.cid && { cid: result.cid }),
            ...(result.uris && { uris: result.uris }),
          });
        }
      } else {
        crossPostResults.push({
          providerId: '',
          instanceName: 'Bluesky',
          success: false,
          error: 'Bluesky account not linked. Please link in Settings.',
        });
      }
    }

    // Cross-post to LinkedIn if enabled (skip for replies, pushes, scheduled)
    if (!parentMessage && !canonicalPushTargetId && !isScheduled && crossPostToLinkedIn === true) {
      const linkedInIdentity = await prisma.linkedIdentity.findFirst({
        where: {
          userId: user.id,
          provider: 'linkedin',
        },
        select: {
          id: true,
          provider: true,
          providerUserId: true,
          providerUsername: true,
          providerData: true,
        },
      });

      if (linkedInIdentity) {
        const result = await postToLinkedIn(linkedInIdentity as Parameters<typeof postToLinkedIn>[0], {
          content: finalContent,
          publiclyVisible: finalPubliclyVisible as boolean,
          imageUrls: finalImageUrls,
          videoUrls: finalVideoUrls,
        });
        crossPostResults.push(result);
        if (result.success && result.url) {
          crossPostUrls.push({
            platform: 'linkedin',
            url: result.url,
            instanceName: 'LinkedIn',
            ...(result.postId && { postId: result.postId }),
          });
        }
      } else {
        crossPostResults.push({
          providerId: '',
          instanceName: 'LinkedIn',
          success: false,
          error: 'LinkedIn account not linked. Please link in Settings.',
        });
      }
    }

    if (crossPostUrls.length > 0) {
      await prisma.message.update({
        where: { id: message.id },
        data: { crossPostUrls: crossPostUrls as object },
      });
      (message as { crossPostUrls?: unknown }).crossPostUrls = crossPostUrls;
    }

    // Reply cross-post: when replying to a cross-posted message, post reply on platforms where
    // the replying user follows the original author
    if (parentMessage && parentMessage.crossPostUrls && Array.isArray(parentMessage.crossPostUrls)) {
      const { isFollowingOnMastodon } = await import('@/lib/crosspost/check-platform-follow');
      const { isFollowingOnBluesky } = await import('@/lib/crosspost/check-platform-follow');
      const { replyToMastodon, replyToBluesky } = await import('@/lib/crosspost/reply-to-external');

      const parentAuthorId = parentMessage.userId;
      const replyingUserIdentities = await prisma.linkedIdentity.findMany({
        where: { userId: user.id },
        select: { id: true, provider: true, providerUserId: true, providerUsername: true, providerData: true },
      });
      const parentAuthorIdentities = await prisma.linkedIdentity.findMany({
        where: { userId: parentAuthorId },
        select: { id: true, provider: true, providerUserId: true, providerUsername: true, providerData: true },
      });

      for (const cp of parentMessage.crossPostUrls as Array<{ platform: string; url: string; instanceName: string; statusId?: string; instanceUrl?: string; uri?: string; cid?: string }>) {
        if (cp.platform === 'mastodon' && cp.statusId && cp.instanceUrl) {
          const authorMastodon = parentAuthorIdentities.find(
            (i) => i.provider.startsWith('mastodon:') && cp.instanceUrl && i.provider === `mastodon:${new URL(cp.instanceUrl).hostname}`
          );
          const replyingMastodon = replyingUserIdentities.find(
            (i) => i.provider.startsWith('mastodon:') && cp.instanceUrl && i.provider === `mastodon:${new URL(cp.instanceUrl).hostname}`
          );
          if (authorMastodon && replyingMastodon) {
            const follows = await isFollowingOnMastodon(
              replyingMastodon as Parameters<typeof isFollowingOnMastodon>[0],
              authorMastodon as Parameters<typeof isFollowingOnMastodon>[1],
              cp.instanceUrl
            );
            if (follows) {
              const result = await replyToMastodon(
                replyingMastodon as Parameters<typeof replyToMastodon>[0],
                cp as Parameters<typeof replyToMastodon>[1],
                finalContent,
                finalPubliclyVisible
              );
              crossPostResults.push({
                providerId: replyingMastodon.id,
                instanceName: result.instanceName,
                success: result.success,
                url: result.url,
                error: result.error,
              });
            }
          }
        } else if (cp.platform === 'bluesky' && cp.uri && cp.cid) {
          const authorBluesky = parentAuthorIdentities.find((i) => i.provider === 'bluesky');
          const replyingBluesky = replyingUserIdentities.find((i) => i.provider === 'bluesky');
          const authorDid = authorBluesky?.providerData && typeof authorBluesky.providerData === 'object' && 'did' in authorBluesky.providerData
            ? (authorBluesky.providerData as { did?: string }).did ?? authorBluesky.providerUserId
            : authorBluesky?.providerUserId;
          if (authorBluesky && replyingBluesky && authorDid) {
            const follows = await isFollowingOnBluesky(
              replyingBluesky as Parameters<typeof isFollowingOnBluesky>[0],
              authorDid
            );
            if (follows) {
              const result = await replyToBluesky(
                replyingBluesky as Parameters<typeof replyToBluesky>[0],
                cp as Parameters<typeof replyToBluesky>[1],
                finalContent,
                finalPubliclyVisible
              );
              crossPostResults.push({
                providerId: replyingBluesky.id,
                instanceName: result.instanceName,
                success: result.success,
                url: result.url,
                error: result.error,
              });
            }
          }
        }
      }
    }

    return NextResponse.json(
      {
        message: isScheduled ? 'Message scheduled successfully' : 'Message created successfully',
        data: message,
        ...(isScheduled && { scheduledAt: scheduledAt?.toISOString() }),
        ...(crossPostResults.length > 0 && { crossPostResults }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const onlyMine = searchParams.get('onlyMine') === 'true';

    // Build where clause based on authentication and viewing preference
    let where: any = {};

    if (user) {
      if (onlyMine) {
        // Only show user's own messages (for dashboard)
        where = {
          userId: user.id, // Only user's own messages
        };
      } else {
        // Get user's viewing preference
        const userWithPreference = await prisma.user.findUnique({
          where: { id: user.id },
          select: { viewingPreference: true },
        });

        const viewingPreference = userWithPreference?.viewingPreference || 'all_messages';

        // Use buildMessageWhereClause to handle follow-based filtering
        where = await buildMessageWhereClause(user.id, viewingPreference);
      }
    } else {
      // Unauthenticated users see only public messages
      where = await buildMessageWhereClause(null, 'all_messages');
    }

    // Only top-level messages (no replies in main feed)
    where = { ...where, parentId: null };

    // Fetch messages ordered by createdAt DESC (newest first)
    const messages = await prisma.message.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await prisma.message.count({ where });

    const messagesWithDugs = await attachDugByMeIncludingPushed(messages, user?.id);

    return NextResponse.json(
      {
        messages: messagesWithDugs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

