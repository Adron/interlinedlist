import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSubscriber } from "@/lib/subscription/is-subscriber";
import {
  getOrCreateTemplatesFolder,
  listTemplateDocuments,
} from "@/lib/documents/templates";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents/templates
 * Ensures _templates root folder exists; lists template documents.
 */
export async function GET() {
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

    const { folderId, created } = await getOrCreateTemplatesFolder(user.id);
    const templates = await listTemplateDocuments(user.id, folderId);

    return NextResponse.json(
      {
        folderCreated: created,
        templatesFolderId: folderId,
        templates,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get document templates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
