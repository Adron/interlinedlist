import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isSubscriber } from "@/lib/subscription/is-subscriber";
import { getFolderById, computeContentHash } from "@/lib/documents/queries";
import {
  getTemplatesFolderId,
  allocateUniqueRelativePath,
} from "@/lib/documents/templates";
import { trackAction } from "@/lib/analytics/track";

export const dynamic = "force-dynamic";

/**
 * POST /api/documents/from-template
 * Body: { templateDocumentId: string, targetFolderId?: string | null }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isSubscriber(user.customerStatus)) {
      return NextResponse.json(
        { error: "Subscribe to create documents." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const templateDocumentId =
      typeof body.templateDocumentId === "string"
        ? body.templateDocumentId
        : "";
    let targetFolderId: string | null = null;
    if (body.targetFolderId !== undefined && body.targetFolderId !== null) {
      if (typeof body.targetFolderId !== "string") {
        return NextResponse.json(
          { error: "targetFolderId must be a string or null." },
          { status: 400 }
        );
      }
      targetFolderId = body.targetFolderId;
    }

    if (!templateDocumentId) {
      return NextResponse.json(
        { error: "templateDocumentId is required." },
        { status: 400 }
      );
    }

    const templatesFolderId = await getTemplatesFolderId(user.id);
    if (!templatesFolderId) {
      return NextResponse.json(
        { error: "Templates folder not found." },
        { status: 404 }
      );
    }

    const template = await prisma.document.findFirst({
      where: {
        id: templateDocumentId,
        userId: user.id,
        folderId: templatesFolderId,
        deletedAt: null,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found." },
        { status: 404 }
      );
    }

    if (targetFolderId !== null) {
      const folder = await getFolderById(targetFolderId, user.id);
      if (!folder) {
        return NextResponse.json(
          { error: "Target folder not found." },
          { status: 404 }
        );
      }
    }

    const title = template.title?.trim() || "Untitled";
    const relativePath = await allocateUniqueRelativePath(
      user.id,
      targetFolderId,
      title
    );
    const content = template.content ?? "";
    const contentHash = computeContentHash(content);

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        folderId: targetFolderId,
        title,
        content,
        relativePath,
        isPublic: false,
        contentHash,
      },
    });

    trackAction("document_create", {
      userId: user.id,
      properties: { documentId: document.id, fromTemplate: true },
    }).catch(() => {});

    return NextResponse.json(
      { message: "Document created successfully", document },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create from template error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
