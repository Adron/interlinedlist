import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { isSubscriber } from "@/lib/subscription/is-subscriber";

export const dynamic = "force-dynamic";

/**
 * GET /api/folders
 * Get all non-deleted list folders for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folders = await prisma.listFolder.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ folders }, { status: 200 });
  } catch (error) {
    console.error("Get list folders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/folders
 * Create a new list folder (subscribers only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
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
      const parent = await prisma.listFolder.findFirst({
        where: { id: parentId, userId: user.id, deletedAt: null },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent folder not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Pre-check for name collision. The DB unique constraint
    // [userId, parentId, name] does NOT enforce uniqueness at root level
    // because Postgres treats NULL parentIds as distinct, so we do a
    // manual check here to return a clean 409.
    const trimmedName = name.trim();
    const resolvedParentId = parentId || null;
    const existing = await prisma.listFolder.findFirst({
      where: {
        userId: user.id,
        parentId: resolvedParentId,
        name: trimmedName,
        deletedAt: null,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A folder with that name already exists here" },
        { status: 409 }
      );
    }

    try {
      const folder = await prisma.listFolder.create({
        data: {
          userId: user.id,
          name: name.trim(),
          parentId: parentId || null,
        },
        select: { id: true, name: true, parentId: true },
      });

      return NextResponse.json(
        { message: "Folder created successfully", folder },
        { status: 201 }
      );
    } catch (createError) {
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A folder with that name already exists here" },
          { status: 409 }
        );
      }
      throw createError;
    }
  } catch (error) {
    console.error("Create list folder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
