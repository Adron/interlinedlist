import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { detectLinks } from '@/lib/messages/link-detector';
import { APP_URL } from '@/lib/config/app';
import { buildMessageWhereClause } from '@/lib/messages/queries';
import { postToMastodon } from '@/lib/mastodon/post-status';
import { postToBluesky } from '@/lib/bluesky/post-status';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

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
    const { content, publiclyVisible, imageUrls, videoUrls, mastodonProviderIds, crossPostToBluesky } = body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Get user's settings
    const userWithSettings = await prisma.user.findUnique({
      where: { id: user.id },
      select: { maxMessageLength: true, defaultPubliclyVisible: true },
    });

    const maxLength = userWithSettings?.maxMessageLength || 666;
    const defaultPubliclyVisible = userWithSettings?.defaultPubliclyVisible ?? false;

    if (content.length > maxLength) {
      return NextResponse.json(
        { error: `Message exceeds maximum length of ${maxLength} characters` },
        { status: 400 }
      );
    }

    // Use provided publiclyVisible, or fall back to user's default
    const finalPubliclyVisible = publiclyVisible !== undefined ? Boolean(publiclyVisible) : defaultPubliclyVisible;

    // Validate imageUrls if provided (1-6 URLs)
    let finalImageUrls: string[] | undefined;
    if (imageUrls !== undefined && imageUrls !== null) {
      if (!Array.isArray(imageUrls)) {
        return NextResponse.json({ error: 'imageUrls must be an array' }, { status: 400 });
      }
      if (imageUrls.length > 6) {
        return NextResponse.json({ error: 'At most 6 images per message' }, { status: 400 });
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

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        publiclyVisible: finalPubliclyVisible,
        userId: user.id,
        ...(finalImageUrls !== undefined && { imageUrls: finalImageUrls }),
        ...(finalVideoUrls !== undefined && { videoUrls: finalVideoUrls }),
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

    // Detect links and trigger async metadata fetch (don't await)
    const detectedLinks = detectLinks(content.trim());
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

    // Cross-post to selected Mastodon accounts
    const crossPostResults: Array<{ providerId: string; instanceName: string; success: boolean; url?: string; error?: string }> = [];
    const crossPostUrls: Array<{ platform: string; url: string; instanceName: string }> = [];
    const providerIds = Array.isArray(mastodonProviderIds)
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
            content: content.trim(),
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
          });
        }
      }
    }

    // Cross-post to Bluesky if enabled
    if (crossPostToBluesky === true) {
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
          content: content.trim(),
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

    if (crossPostUrls.length > 0) {
      await prisma.message.update({
        where: { id: message.id },
        data: { crossPostUrls: crossPostUrls as object },
      });
      (message as { crossPostUrls?: unknown }).crossPostUrls = crossPostUrls;
    }

    return NextResponse.json(
      {
        message: 'Message created successfully',
        data: message,
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
    const user = await getCurrentUser();
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
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await prisma.message.count({ where });

    return NextResponse.json(
      {
        messages,
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

