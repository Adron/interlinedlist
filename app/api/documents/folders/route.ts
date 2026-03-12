import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isSubscriber } from "@/lib/subscription/is-subscriber";
import { getRootFolders, validateFolderParent } from "@/lib/documents/queries";
import { trackAction } from "@/lib/analytics/track";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents/folders
 * Get root folders for the current user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folders = await getRootFolders(user.id);
    return NextResponse.json({ folders }, { status: 200 });
  } catch (error) {
    console.error("Get folders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/documents/folders
 * Create a new folder
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isSubscriber(user.customerStatus)) {
      return NextResponse.json(
        { error: "Subscribe to create folders." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, parentId } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (parentId != null) {
      if (typeof parentId !== "string") {
        return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
      }
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, userId: user.id, deletedAt: null },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent folder not found or access denied" },
          { status: 404 }
        );
      }
    }

    const folder = await prisma.folder.create({
      data: {
        userId: user.id,
        name: name.trim(),
        parentId: parentId || null,
      },
    });

    trackAction("document_create", { userId: user.id, properties: { folderId: folder.id, type: "folder" } }).catch(() => {});

    return NextResponse.json(
      { message: "Folder created successfully", folder },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create folder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
