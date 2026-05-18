import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { isSubscriber } from "@/lib/subscription/is-subscriber";
import {
  getOrCreateTemplatesFolder,
  listTemplateDocuments,
  seedDefaultTemplates,
} from "@/lib/documents/templates";

export const dynamic = "force-dynamic";

/**
 * POST /api/documents/templates/seed-defaults
 * Idempotently adds default Recipe and Social Media Campaign templates.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isSubscriber(user.customerStatus)) {
      return NextResponse.json(
        { error: "Subscribe to create documents." },
        { status: 403 }
      );
    }

    const { folderId } = await getOrCreateTemplatesFolder(user.id);
    await seedDefaultTemplates(user.id, folderId);
    const templates = await listTemplateDocuments(user.id, folderId);

    return NextResponse.json(
      { templatesFolderId: folderId, templates },
      { status: 200 }
    );
  } catch (error) {
    console.error("Seed document templates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
