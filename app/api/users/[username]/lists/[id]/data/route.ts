import { NextRequest, NextResponse } from "next/server";
import {
  getPublicListDataRows,
  verifyPublicListBelongsToUser,
} from "@/lib/lists/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/[username]/lists/[id]/data
 * Get list data rows for a public list with pagination, filtering, sorting.
 * No auth required. Verifies list exists, is public, and belongs to user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  try {
    const { username, id: listId } = await params;

    const list = await verifyPublicListBelongsToUser(listId, username);

    if (!list) {
      return NextResponse.json(
        { error: "List not found or not public" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!, 10)
      : undefined;

    const filter: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      if (!["limit", "offset", "page", "sort", "order"].includes(key)) {
        filter[key] = value;
      }
    });

    const sortField = searchParams.get("sort");
    const sortOrder = searchParams.get("order") as "asc" | "desc" | null;

    const result = await getPublicListDataRows(listId, {
      pagination: {
        limit,
        offset: page ? undefined : offset,
        page,
      },
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sort: sortField
        ? {
            field: sortField,
            order: sortOrder || "asc",
          }
        : undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Get public list data error:", error);
    if (error.message === "List not found or not public") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
