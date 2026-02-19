import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/lists/[id]/watchers/me
 * Check if current user is watching the list.
 * Requires auth.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: listId } = await params;

    const watcher = await prisma.listWatcher.findUnique({
      where: {
        userId_listId: {
          userId: user.id,
          listId,
        },
      },
    });

    return NextResponse.json(
      { watching: !!watcher },
      { status: 200 }
    );
  } catch (error) {
    console.error("Check list watcher error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
