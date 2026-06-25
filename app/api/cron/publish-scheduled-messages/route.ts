import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { postToMastodon } from "@/lib/mastodon/post-status";
import { postToBluesky } from "@/lib/bluesky/post-status";
import { postToLinkedIn } from "@/lib/linkedin/post-status";
import {
  parseRequestedLinkedInTarget,
  parseRequestedLinkedInTargets,
  resolveLinkedInTarget,
  type RequestedLinkedInTarget,
} from "@/lib/linkedin/resolve-linkedin-target";
import { postToTwitter } from "@/lib/twitter/post-status";
import { isAuthorizedCronRequest } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/publish-scheduled-messages
 * Cron: publishes scheduled messages whose scheduledAt has passed.
 * Runs cross-posting for any scheduled messages that are due.
 * Secured by CRON_SECRET (Vercel Cron sends it as `Authorization: Bearer`).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      | { mastodonProviderIds?: string[]; crossPostToBluesky?: boolean; crossPostToLinkedIn?: boolean; linkedInLinkAsFirstComment?: boolean; crossPostToTwitter?: boolean; linkedInTarget?: unknown; linkedInTargets?: unknown }
      | null;
    const mastodonProviderIds = config?.mastodonProviderIds ?? [];
    const crossPostToBluesky = config?.crossPostToBluesky === true;
    const crossPostToLinkedIn = config?.crossPostToLinkedIn === true;
    const linkedInLinkAsFirstComment = config?.linkedInLinkAsFirstComment === true;
    const crossPostToTwitter = config?.crossPostToTwitter === true;
    // Malformed stored targets must never block publishing; treat them as "no explicit target".
    // The array form takes precedence; the legacy single field is treated as a one-element array.
    const parsedLinkedInTargets = parseRequestedLinkedInTargets(config?.linkedInTargets);
    const parsedLinkedInTarget = parseRequestedLinkedInTarget(config?.linkedInTarget);
    const requestedLinkedInTargets: RequestedLinkedInTarget[] | undefined =
      (parsedLinkedInTargets.ok && parsedLinkedInTargets.targets && parsedLinkedInTargets.targets.length > 0
        ? parsedLinkedInTargets.targets
        : undefined) ??
      (parsedLinkedInTarget.ok && parsedLinkedInTarget.target
        ? [parsedLinkedInTarget.target]
        : undefined);

    const imageUrls = message.imageUrls as string[] | null;
    const videoUrls = message.videoUrls as string[] | null;
    const finalImageUrls = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : undefined;
    const finalVideoUrls = Array.isArray(videoUrls) && videoUrls.length > 0 ? videoUrls : undefined;

    const crossPostUrls: Array<{
      platform: string;
      url: string;
      instanceName: string;
      statusId?: string;
      statusIds?: string[];
      instanceUrl?: string;
      uri?: string;
      cid?: string;
      uris?: string[];
      tweetId?: string;
      tweetIds?: string[];
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
              ...(result.statusIds && { statusIds: result.statusIds }),
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
              ...(result.uris && { uris: result.uris }),
            });
          }
        }
      }

      if (crossPostToLinkedIn) {
        // Post to each requested target independently so one failure does not
        // abort the others. No explicit targets falls back to legacy resolution.
        const linkedInTargetsToPost: Array<RequestedLinkedInTarget | undefined> =
          requestedLinkedInTargets && requestedLinkedInTargets.length > 0
            ? requestedLinkedInTargets
            : [undefined];

        for (const requestedTarget of linkedInTargetsToPost) {
          const targetDescriptor =
            requestedTarget?.kind === "orgPage"
              ? ` (page ${requestedTarget.pageId})`
              : requestedTarget?.kind === "personalPage"
                ? ` (company page ${requestedTarget.personalPageId})`
                : requestedTarget?.kind === "personal"
                  ? " (personal)"
                  : "";
          const linkedInTarget = await resolveLinkedInTarget(message.userId, requestedTarget);

          if (linkedInTarget) {
            const result = await postToLinkedIn(linkedInTarget, {
              content: message.content,
              publiclyVisible: message.publiclyVisible,
              imageUrls: finalImageUrls,
              videoUrls: finalVideoUrls,
              linkAsFirstComment: linkedInLinkAsFirstComment,
            });
            if (result.success && result.url) {
              crossPostUrls.push({
                platform: "linkedin",
                url: result.url,
                instanceName: "LinkedIn",
                ...(result.postId && { postId: result.postId }),
              });
            } else if (!result.success) {
              errors.push(
                `Message ${message.id}: LinkedIn cross-post failed${targetDescriptor}: ${result.error ?? "Unknown error"}`
              );
            }
          } else {
            errors.push(
              `Message ${message.id}: LinkedIn target unavailable${targetDescriptor}, cross-post skipped`
            );
          }
        }
      }

      if (crossPostToTwitter) {
        const twitterIdentity = await prisma.linkedIdentity.findFirst({
          where: { userId: message.userId, provider: "twitter" },
          select: { id: true, provider: true, providerUsername: true, providerData: true },
        });
        if (twitterIdentity) {
          const result = await postToTwitter(twitterIdentity as Parameters<typeof postToTwitter>[0], {
            content: message.content,
            publiclyVisible: message.publiclyVisible,
            imageUrls: finalImageUrls,
            videoUrls: finalVideoUrls,
          });
          if (result.success && result.url) {
            crossPostUrls.push({
              platform: "twitter",
              url: result.url,
              instanceName: "Twitter",
              ...(result.tweetId && { tweetId: result.tweetId }),
              ...(result.tweetIds && { tweetIds: result.tweetIds }),
            });
          }
        }
      }

      await prisma.message.update({
        where: { id: message.id },
        data: {
          scheduledAt: null,
          scheduledCrossPostConfig: Prisma.DbNull,
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
