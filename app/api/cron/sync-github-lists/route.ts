import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGitHubIssuesContextForUserId } from "@/lib/github/issues";
import { syncListCacheFromGitHub } from "@/lib/lists/github-list-adapter";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/sync-github-lists
 * Hourly cron: syncs all GitHub-backed lists from GitHub API to cache.
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

  const lists = await prisma.list.findMany({
    where: {
      source: "github",
      deletedAt: null,
      githubRepo: { not: null },
    },
    select: { id: true, userId: true, githubRepo: true },
  });

  let synced = 0;
  const errors: string[] = [];

  for (const list of lists) {
    const repo = list.githubRepo;
    if (!repo) continue;

    try {
      const ctx = await getGitHubIssuesContextForUserId(list.userId, repo);
      if ("error" in ctx) {
        errors.push(`List ${list.id}: ${ctx.error}`);
        continue;
      }
      await syncListCacheFromGitHub(list.id, ctx.context);
      synced++;
    } catch (err) {
      errors.push(`List ${list.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return NextResponse.json({
    message: "Sync complete",
    synced,
    total: lists.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
