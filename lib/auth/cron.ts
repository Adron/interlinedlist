/**
 * Authentication for Vercel Cron (and manual) invocations of /api/cron/* routes.
 */

import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Verify a request against CRON_SECRET.
 *
 * SECURITY: fails CLOSED. If CRON_SECRET is not configured, no request is
 * authorized — previously the routes ran with no auth at all when the secret was
 * unset, letting anyone trigger scheduled cross-posting and GitHub sync.
 *
 * When CRON_SECRET is set, Vercel Cron sends it as `Authorization: Bearer
 * <CRON_SECRET>`. The comparison is constant-time to avoid leaking the secret
 * via timing.
 */
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false; // fail closed: no secret configured ⇒ deny

  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(cronSecret);
  // timingSafeEqual throws on length mismatch; check length first (the length of
  // a secret is not itself sensitive).
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
