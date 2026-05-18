import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/push/unregister — remove a device token on logout.
 * Body: { token: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    await prisma.deviceToken.deleteMany({
      where: { token, userId: user.id },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/push/unregister error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
