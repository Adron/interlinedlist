import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postToMastodon } from "@/lib/mastodon/post-status";
import { postToBluesky } from "@/lib/bluesky/post-status";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/publish-scheduled-messages
 * Cron: publishes scheduled messages whose scheduledAt has passed.
 * Runs cross-posting for any scheduled messages that are due.
 * Secured by CRON_SECRET header (Vercel Cron sends this).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const provided = authHeader?.replace(/^Bearer\s+/i, "") || request.headers.get("x-vercel-cron");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const due = await prisma.message.findMany({
    where: {
      scheduledAt: { lte: now, not: null },
      parentId: null,
    },
    include: {
      user: {
        select: { id: true },
      },
    },
  });

  let published = 0;
  const errors: string[] = [];

  for (const message of due) {
    const config = message.scheduledCrossPostConfig as
      | { mastodonProviderIds?: string[]; crossPostToBluesky?: boolean }
      | null;
    const mastodonProviderIds = config?.mastodonProviderIds ?? [];
    const crossPostToBluesky = config?.crossPostToBluesky === true;

    const imageUrls = message.imageUrls as string[] | null;
    const videoUrls = message.videoUrls as string[] | null;
    const finalImageUrls = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : undefined;
    const finalVideoUrls = Array.isArray(videoUrls) && videoUrls.length > 0 ? videoUrls : undefined;

    const crossPostUrls: Array<{
      platform: string;
      url: string;
      instanceName: string;
      statusId?: string;
      instanceUrl?: string;
      uri?: string;
      cid?: string;
    }> = [];

    try {
      if (mastodonProviderIds.length > 0) {
        const identities = await prisma.linkedIdentity.findMany({
          where: {
            id: { in: mastodonProviderIds },
            userId: message.userId,
            provider: { startsWith: "mastodon:" },
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
            identity as Parameters<typeof postToMastodon>[0],
            {
              content: message.content,
              publiclyVisible: message.publiclyVisible,
              imageUrls: finalImageUrls,
              videoUrls: finalVideoUrls,
            }
          );
          if (result.success && result.url) {
            crossPostUrls.push({
              platform: "mastodon",
              url: result.url,
              instanceName: result.instanceName,
              ...(result.statusId && { statusId: result.statusId }),
              ...(result.instanceUrl && { instanceUrl: result.instanceUrl }),
            });
          }
        }
      }

      if (crossPostToBluesky) {
        const blueskyIdentity = await prisma.linkedIdentity.findFirst({
          where: {
            userId: message.userId,
            provider: "bluesky",
          },
          select: {
            id: true,
            provider: true,
            providerUsername: true,
            providerData: true,
          },
        });

        if (blueskyIdentity) {
          const result = await postToBluesky(
            blueskyIdentity as Parameters<typeof postToBluesky>[0],
            {
              content: message.content,
              publiclyVisible: message.publiclyVisible,
              imageUrls: finalImageUrls,
              videoUrls: finalVideoUrls,
            }
          );
          if (result.success && result.url) {
            crossPostUrls.push({
              platform: "bluesky",
              url: result.url,
              instanceName: "Bluesky",
              ...(result.uri && { uri: result.uri }),
              ...(result.cid && { cid: result.cid }),
            });
          }
        }
      }

      await prisma.message.update({
        where: { id: message.id },
        data: {
          scheduledAt: null,
          scheduledCrossPostConfig: null,
          ...(crossPostUrls.length > 0 && { crossPostUrls: crossPostUrls as object }),
        },
      });
      published++;
    } catch (err) {
      errors.push(
        `Message ${message.id}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return NextResponse.json({
    message: "Publish complete",
    published,
    total: due.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
