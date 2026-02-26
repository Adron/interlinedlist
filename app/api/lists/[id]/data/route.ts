import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getListDataRows,
  createListDataRow,
  bulkCreateListDataRows,
  getListProperties,
} from "@/lib/lists/queries";
import { validateFormData } from "@/lib/lists/dsl-validator";
import { prisma } from "@/lib/prisma";
import { getGitHubIssuesContext, githubFetch } from "@/lib/github/issues";
import { issueToRow, rowDataToIssuePayload } from "@/lib/lists/github-list-adapter";

export const dynamic = "force-dynamic";

/**
 * GET /api/lists/[id]/data
 * Get list data rows with pagination, filtering, and sorting
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;

    const filter: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      if (!["limit", "offset", "page", "sort", "order"].includes(key)) {
        filter[key] = value;
      }
    });

    const sortField = searchParams.get("sort");
    const sortOrder = searchParams.get("order") as "asc" | "desc" | null;

    let result = await getListDataRows(id, user.id, {
      pagination: {
        limit,
        offset: page ? undefined : offset,
        page,
      },
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sort: sortField
        ? { field: sortField, order: sortOrder || "asc" }
        : undefined,
    });

    if ((list as { source?: string }).source === "github" && result.rows.length === 0) {
      const { syncListCacheFromGitHub } = await import("@/lib/lists/github-list-adapter");
      const ctx = await getGitHubIssuesContext((list as { githubRepo?: string }).githubRepo ?? "");
      if (!("error" in ctx)) {
        await syncListCacheFromGitHub(id, ctx.context);
        result = await getListDataRows(id, user.id, {
          pagination: { limit, offset: page ? undefined : offset, page },
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          sort: sortField ? { field: sortField, order: sortOrder || "asc" } : undefined,
        });
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("Get list data error:", error);
    if (error instanceof Error && error.message === "List not found or access denied") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/lists/[id]/data
 * Create a new list data row or bulk create rows
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = await request.json();
    const { data, bulk } = body;

    const isGitHubList = (list as { source?: string }).source === "github";

    if (isGitHubList && bulk) {
      return NextResponse.json(
        { error: "Bulk create is not supported for GitHub-backed lists" },
        { status: 400 }
      );
    }

    const properties = await getListProperties(id, user.id);
    if (!properties) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (!isGitHubList && bulk && Array.isArray(data)) {
      for (const rowData of data) {
        const validation = validateFormData(properties, rowData);
        if (!validation.isValid) {
          return NextResponse.json(
            { error: "Validation failed", details: validation.errors },
            { status: 400 }
          );
        }
      }
      const result = await bulkCreateListDataRows(id, user.id, data);
      return NextResponse.json(
        { message: `${result.count} rows created successfully`, count: result.count },
        { status: 201 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    const validation = validateFormData(properties, data);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

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
        `/repos/${ctx.context.owner}/${ctx.context.repoName}/issues`,
        ctx.context.accessToken,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const issue = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: (issue as { message?: string }).message || "Failed to create issue" },
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
      return NextResponse.json({ message: "Row created successfully", data: row }, { status: 201 });
    }

    const row = await createListDataRow(id, user.id, data);
    return NextResponse.json({ message: "Row created successfully", data: row }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create list data error:", error);
    if (error instanceof Error && error.message === "List not found or access denied") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
