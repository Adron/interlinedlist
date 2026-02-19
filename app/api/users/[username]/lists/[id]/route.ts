import { NextResponse } from "next/server";
import { getPublicListWithAncestorChain } from "@/lib/lists/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/[username]/lists/[id]
 * Get public list metadata and ancestor chain for breadcrumbs.
 * No auth required. Verifies list exists, is public, and belongs to user.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  try {
    const { username, id: listId } = await params;

    const result = await getPublicListWithAncestorChain(listId, username);

    if (!result) {
      return NextResponse.json(
        { error: "List not found or not public" },
        { status: 404 }
      );
    }

    const { list, ancestors } = result;

    return NextResponse.json(
      {
        list: {
          id: list.id,
          title: list.title,
          description: list.description,
          parentId: list.parentId,
          children: list.children,
        },
        ancestors,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get public list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
