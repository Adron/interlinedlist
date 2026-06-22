/**
 * Proactive access-token refresh for Twitter/X identities.
 *
 * Twitter access tokens issued with the `offline.access` scope expire after
 * ~7200 seconds (2 hours). Refresh tokens are non-expiring but *single-use* —
 * each refresh issues a new refresh token that replaces the previous one.
 *
 * Pattern:
 *   1. Read access_token + expires_at from LinkedIdentity.providerData.
 *   2. If the token is still valid for >= EXPIRY_SKEW_MS, return as-is.
 *   3. Otherwise call refreshTwitterToken() to exchange the stored refresh
 *      token for a fresh pair and persist the result.
 *   4. Return the fresh access token (or null if refresh fails).
 *
 * The cross-post code path also calls forceRefreshTwitterAccessToken() on a
 * 401 response as a safety net for the case where the provider invalidated
 * the token before its declared expiry.
 */

import { prisma } from '@/lib/prisma';
import { refreshTwitterToken } from '@/lib/auth/oauth-twitter';
import type { TwitterProviderData } from '@/lib/twitter/post-status';

/** Refresh when the access token has less than this many milliseconds left. */
const EXPIRY_SKEW_MS = 60_000;

export interface TwitterIdentityForRefresh {
  id: string;
  providerData: TwitterProviderData | null;
}

/**
 * Returns true when the stored access token is still valid for at least
 * EXPIRY_SKEW_MS. Tokens without a stored expires_at are treated as valid
 * (callers will fall back to refresh-on-401 in that case).
 */
function isAccessTokenFresh(providerData: TwitterProviderData | null): boolean {
  if (!providerData?.access_token) return false;
  if (typeof providerData.expires_at !== 'number') return true;
  return providerData.expires_at - Date.now() > EXPIRY_SKEW_MS;
}

/**
 * Persists a refreshed token pair back to LinkedIdentity.providerData.
 * Preserves any other keys callers may have stored alongside the token.
 */
async function persistRefreshedTwitterToken(
  identityId: string,
  existing: TwitterProviderData | null,
  refreshed: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }
): Promise<TwitterProviderData> {
  const next: TwitterProviderData = {
    ...(existing ?? {}),
    access_token: refreshed.access_token,
    // Twitter refresh tokens are single-use. The response always carries the
    // replacement; if it is somehow missing we keep the prior value so the
    // next refresh attempt has *some* refresh token to try (and will fail
    // explicitly rather than silently dropping the credential).
    refresh_token: refreshed.refresh_token ?? existing?.refresh_token,
    ...(refreshed.expires_in
      ? { expires_at: Date.now() + refreshed.expires_in * 1000 }
      : {}),
  };
  await prisma.linkedIdentity.update({
    where: { id: identityId },
    data: { providerData: next as object },
  });
  return next;
}

/**
 * Returns a valid Twitter access token for the given identity, refreshing
 * proactively if the stored token is expired or near expiry. Returns null when
 * no usable token can be produced (e.g. refresh fails, no refresh token on
 * file).
 */
export async function getValidTwitterAccessToken(
  identity: TwitterIdentityForRefresh
): Promise<string | null> {
  const providerData = identity.providerData;
  if (!providerData?.access_token) return null;

  if (isAccessTokenFresh(providerData)) {
    return providerData.access_token;
  }

  if (!providerData.refresh_token) {
    // Can't refresh — fall through to the stored token and let the caller
    // surface the 401. This matches pre-refactor behaviour for legacy rows.
    return providerData.access_token;
  }

  try {
    const refreshed = await refreshTwitterToken(providerData.refresh_token);
    const next = await persistRefreshedTwitterToken(
      identity.id,
      providerData,
      refreshed
    );
    return next.access_token;
  } catch (err) {
    console.error(
      `[twitter] proactive refresh failed for identity ${identity.id}:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Forces a refresh ignoring the cached expiry — used as a fallback when a
 * post call returns 401. Returns null when refresh is impossible or fails.
 */
export async function forceRefreshTwitterAccessToken(
  identity: TwitterIdentityForRefresh
): Promise<string | null> {
  const providerData = identity.providerData;
  if (!providerData?.refresh_token) return null;

  try {
    const refreshed = await refreshTwitterToken(providerData.refresh_token);
    const next = await persistRefreshedTwitterToken(
      identity.id,
      providerData,
      refreshed
    );
    return next.access_token;
  } catch (err) {
    console.error(
      `[twitter] forced refresh after 401 failed for identity ${identity.id}:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
