import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getListDataRowById,
  updateListDataRow,
  deleteListDataRow,
  getListProperties,
} from "@/lib/lists/queries";
import { validateFormData } from "@/lib/lists/dsl-validator";
import { prisma } from "@/lib/prisma";
import { getGitHubIssuesContext, githubFetch } from "@/lib/github/issues";
import { issueToRow, rowDataToIssuePayload } from "@/lib/lists/github-list-adapter";

export const dynamic = "force-dynamic";

async function resolveParams(params: Promise<{ id: string; rowId: string }> | { id: string; rowId: string }) {
  return typeof (params as Promise<{ id: string; rowId: string }>).then === "function"
    ? await (params as Promise<{ id: string; rowId: string }>)
    : (params as { id: string; rowId: string });
}

/**
 * GET /api/lists/[id]/data/[rowId]
 * Get a single list data row
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string }> | { id: string; rowId: string } }
) {
  try {
    const { id, rowId } = await resolveParams(params);
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const row = await getListDataRowById(rowId, id, user.id);

    if (!row) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }

    return NextResponse.json({ data: row }, { status: 200 });
  } catch (error) {
    console.error("Get list data row error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/lists/[id]/data/[rowId]
 * Update a list data row
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string }> | { id: string; rowId: string } }
) {
  try {
    const { id, rowId } = await resolveParams(params);
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    const list = await prisma.list.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      select: { source: true, githubRepo: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const properties = await getListProperties(id, user.id);
    if (!properties) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const validation = validateFormData(properties, data);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const isGitHubList = (list as { source?: string }).source === "github";

    if (isGitHubList) {
      const repo = (list as { githubRepo?: string }).githubRepo;
      if (!repo) {
        return NextResponse.json({ error: "GitHub repo not configured" }, { status: 400 });
      }
      const ctx = await getGitHubIssuesContext(repo);
      if ("error" in ctx) {
        return NextResponse.json({ error: ctx.error }, { status: ctx.status });
      }
      const payload = rowDataToIssuePayload(data as Record<string, unknown>);
      const res = await githubFetch(
        `/repos/${ctx.context.owner}/${ctx.context.repoName}/issues/${rowId}`,
        ctx.context.accessToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const issue = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: (issue as { message?: string }).message || "Failed to update issue" },
          { status: res.status }
        );
      }
      await prisma.listGitHubIssueCache.upsert({
        where: { listId_issueNumber: { listId: id, issueNumber: issue.number } },
        create: {
          listId: id,
          issueNumber: issue.number,
          issueData: issue as object,
        },
        update: { issueData: issue as object, fetchedAt: new Date() },
      });
      const row = issueToRow(issue);
      return NextResponse.json({ message: "Row updated successfully", data: row }, { status: 200 });
    }

    const row = await updateListDataRow(rowId, id, user.id, data);
    return NextResponse.json({ message: "Row updated successfully", data: row }, { status: 200 });
  } catch (error: unknown) {
    console.error("Update list data row error:", error);
    if (error instanceof Error && error.message === "List not found or access denied") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/lists/[id]/data/[rowId]
 * Delete a list data row (soft delete). For GitHub lists, closes the issue.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string }> | { id: string; rowId: string } }
) {
  try {
    const { id, rowId } = await resolveParams(params);
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

    const isGitHubList = (list as { source?: string }).source === "github";

    if (isGitHubList) {
      const repo = (list as { githubRepo?: string }).githubRepo;
      if (!repo) {
        return NextResponse.json({ error: "GitHub repo not configured" }, { status: 400 });
      }
      const ctx = await getGitHubIssuesContext(repo);
      if ("error" in ctx) {
        return NextResponse.json({ error: ctx.error }, { status: ctx.status });
      }
      const res = await githubFetch(
        `/repos/${ctx.context.owner}/${ctx.context.repoName}/issues/${rowId}`,
        ctx.context.accessToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: "closed" }),
        }
      );
      const issue = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: (issue as { message?: string }).message || "Failed to close issue" },
          { status: res.status }
        );
      }
      await prisma.listGitHubIssueCache.upsert({
        where: { listId_issueNumber: { listId: id, issueNumber: issue.number } },
        create: {
          listId: id,
          issueNumber: issue.number,
          issueData: issue as object,
        },
        update: { issueData: issue as object, fetchedAt: new Date() },
      });
      return NextResponse.json({ message: "Row deleted successfully" }, { status: 200 });
    }

    await deleteListDataRow(rowId, id, user.id);
    return NextResponse.json({ message: "Row deleted successfully" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Delete list data row error:", error);
    if (error instanceof Error && error.message === "List not found or access denied") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
