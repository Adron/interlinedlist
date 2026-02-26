import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getGitHubIssuesContext } from "@/lib/github/issues";
import { syncListCacheFromGitHub } from "@/lib/lists/github-list-adapter";

export const dynamic = "force-dynamic";

/**
 * POST /api/lists/[id]/refresh
 * Manual refresh for GitHub-backed lists. Fetches issues from GitHub and updates cache.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await prisma.list.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      select: { source: true, githubRepo: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if ((list as { source?: string }).source !== "github") {
      return NextResponse.json(
        { error: "Refresh is only available for GitHub-backed lists" },
        { status: 400 }
      );
    }

    const repo = (list as { githubRepo?: string }).githubRepo;
    if (!repo) {
      return NextResponse.json({ error: "GitHub repo not configured" }, { status: 400 });
    }

    const ctx = await getGitHubIssuesContext(repo);
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const count = await syncListCacheFromGitHub(id, ctx.context);
    return NextResponse.json({ message: "Refreshed", count }, { status: 200 });
  } catch (error) {
    console.error("Refresh list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
