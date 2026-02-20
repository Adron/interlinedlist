import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { computeContentHash } from "@/lib/documents/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents/sync?lastSyncAt=...
 * Return folders and documents changed since lastSyncAt (delta sync).
 * If no lastSyncAt, return full state.
 * Auth: session cookie or Authorization: Bearer <api-key>
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lastSyncAt = searchParams.get("lastSyncAt");

    const folderWhere: { userId: string; deletedAt: null } & { updatedAt?: { gt: Date } } = {
      userId: user.id,
      deletedAt: null,
    };
    const documentWhere: { userId: string; deletedAt: null } & { updatedAt?: { gt: Date } } = {
      userId: user.id,
      deletedAt: null,
    };

    if (lastSyncAt) {
      const since = new Date(lastSyncAt);
      if (!isNaN(since.getTime())) {
        folderWhere.updatedAt = { gt: since };
        documentWhere.updatedAt = { gt: since };
      }
    }

    const [folders, documents] = await Promise.all([
      prisma.folder.findMany({
        where: folderWhere,
        orderBy: [{ parentId: "asc" }, { name: "asc" }],
      }),
      prisma.document.findMany({
        where: documentWhere,
        orderBy: { updatedAt: "asc" },
      }),
    ]);

    const serverTime = new Date().toISOString();

    return NextResponse.json(
      {
        folders,
        documents,
        lastSyncAt: serverTime,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sync GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/documents/sync
 * Apply batch of create/update/delete operations from CLI
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { operations } = body;

    if (!Array.isArray(operations)) {
      return NextResponse.json(
        { error: "operations must be an array" },
        { status: 400 }
      );
    }

    for (const op of operations) {
      const { op: opType, type, path, data } = op;
      if (!opType || !type) continue;

      try {
        if (type === "folder") {
          if (opType === "create") {
            const parentPath = path.includes("/") ? path.split("/").slice(0, -1).join("/") : null;
            let parentId: string | null = null;
            if (parentPath) {
              const parts = parentPath.split("/");
              let currentId: string | null = null;
              for (const part of parts) {
                const existingFolder: { id: string } | null =
                  await prisma.folder.findFirst({
                    where: {
                      userId: user.id,
                      parentId: currentId,
                      name: part,
                      deletedAt: null,
                    },
                    select: { id: true },
                  });
                if (!existingFolder) break;
                currentId = existingFolder.id;
              }
              parentId = currentId;
            }
            const name = path.includes("/") ? path.split("/").pop()! : path;
            const existing = await prisma.folder.findFirst({
              where: {
                userId: user.id,
                parentId,
                name,
                deletedAt: null,
              },
            });
            if (!existing) {
              await prisma.folder.create({
                data: {
                  ...(data?.id && { id: data.id }),
                  userId: user.id,
                  parentId,
                  name,
                },
              });
            }
          } else if (opType === "delete" && data?.id) {
            await prisma.folder.updateMany({
              where: { id: data.id, userId: user.id },
              data: { deletedAt: new Date() },
            });
          }
        } else if (type === "document") {
          if (opType === "create" || opType === "update") {
            const { id, folderId, title, content, relativePath, isPublic } = data || {};
            if (!id || !relativePath) continue;

            const contentHash = content ? computeContentHash(content) : undefined;

            await prisma.document.upsert({
              where: { id },
              create: {
                id,
                userId: user.id,
                folderId: folderId || null,
                title: title || relativePath.replace(/\.md$/, ""),
                content: content ?? "",
                relativePath,
                isPublic: isPublic === true,
                contentHash: contentHash ?? null,
              },
              update: {
                ...(title !== undefined && { title }),
                ...(content !== undefined && { content }),
                ...(contentHash !== undefined && { contentHash }),
                ...(folderId !== undefined && { folderId: folderId || null }),
                ...(isPublic !== undefined && { isPublic: isPublic === true }),
              },
            });
          } else if (opType === "delete" && data?.id) {
            await prisma.document.updateMany({
              where: { id: data.id, userId: user.id },
              data: { deletedAt: new Date() },
            });
          }
        }
      } catch (err) {
        console.error("Sync op error:", op, err);
      }
    }

    const serverTime = new Date().toISOString();
    return NextResponse.json({ lastSyncAt: serverTime }, { status: 200 });
  } catch (error) {
    console.error("Sync POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
