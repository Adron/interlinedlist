import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/register — register a device token for push notifications.
 * Body: { token: string, platform: "ios" | "android" }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token, platform } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    if (platform !== "ios" && platform !== "android") {
      return NextResponse.json({ error: "platform must be ios or android" }, { status: 400 });
    }

    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId: user.id, platform, updatedAt: new Date() },
      create: { userId: user.id, token, platform },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("POST /api/push/register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
