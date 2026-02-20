/**
 * API key (sync token) authentication for CLI and other non-browser clients.
 * Supports Authorization: Bearer <token> on sync endpoints.
 */

import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./session";

export type AuthUser = Awaited<ReturnType<typeof getCurrentUser>>;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Get current user from session cookie OR from Authorization: Bearer <sync-token>.
 * Use this for sync API endpoints that need to support both web (session) and CLI (API key).
 */
export async function getCurrentUserOrSyncToken(
  request?: NextRequest
): Promise<AuthUser> {
  // Try Bearer token first (CLI)
  if (request) {
    const auth = request.headers.get("authorization");
    const match = auth?.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const token = match[1].trim();
      if (token) {
        const tokenHash = hashToken(token);
        const syncToken = await prisma.syncToken.findUnique({
          where: { tokenHash },
          include: { user: true },
        });
        if (syncToken) {
          const u = syncToken.user;
          let isAdministrator = false;
          try {
            const admin = await prisma.administrator.findUnique({
              where: { userId: u.id },
            });
            isAdministrator = !!admin;
          } catch {
            isAdministrator = false;
          }
          return {
            id: u.id,
            email: u.email,
            username: u.username,
            displayName: u.displayName,
            avatar: u.avatar,
            bio: u.bio,
            theme: (u as { theme?: string }).theme ?? "system",
            emailVerified: u.emailVerified,
            pendingEmail: (u as { pendingEmail?: string | null }).pendingEmail ?? null,
            maxMessageLength: (u as { maxMessageLength?: number }).maxMessageLength ?? 666,
            defaultPubliclyVisible: (u as { defaultPubliclyVisible?: boolean }).defaultPubliclyVisible ?? false,
            messagesPerPage: (u as { messagesPerPage?: number }).messagesPerPage ?? 20,
            viewingPreference: (u as { viewingPreference?: string }).viewingPreference ?? "all_messages",
            showPreviews: (u as { showPreviews?: boolean }).showPreviews ?? true,
            showAdvancedPostSettings: (u as { showAdvancedPostSettings?: boolean }).showAdvancedPostSettings ?? false,
            latitude: (u as { latitude?: number | null }).latitude ?? null,
            longitude: (u as { longitude?: number | null }).longitude ?? null,
            isPrivateAccount: (u as { isPrivateAccount?: boolean }).isPrivateAccount ?? false,
            cleared: (u as { cleared?: boolean }).cleared ?? false,
            createdAt: u.createdAt,
            isAdministrator,
          };
        }
      }
    }
  }

  // Fall back to session (web)
  return getCurrentUser();
}
