/**
 * Helpers for the LinkedIn LinkedIdentity.providerData Json payload.
 *
 * Pure functions only (no Prisma) so they can be shared by lib modules,
 * API routes, and unit tests without extra mocking.
 */

export interface LinkedInProviderData {
  access_token?: string;
  expires_in?: number;
  /** ISO timestamp derived from expires_in at token issue time. */
  expires_at?: string;
  /** Space-separated scopes granted at token issue time. */
  scope?: string;
}

const LINKEDIN_ORG_ADMIN_SCOPE = 'rw_organization_admin';

/** True when the granted scope string includes the org-admin scope. */
export function hasLinkedInOrgScope(scope: string | null | undefined): boolean {
  if (!scope) return false;
  return scope.split(/[\s,]+/).includes(LINKEDIN_ORG_ADMIN_SCOPE);
}

/**
 * Returns the access token when present and not expired, otherwise null.
 * Tokens without a stored expires_at (legacy rows) are treated as active.
 */
export function getActiveLinkedInAccessToken(
  providerData: LinkedInProviderData | null | undefined
): string | null {
  const accessToken = providerData?.access_token;
  if (!accessToken || typeof accessToken !== 'string') return null;
  if (providerData?.expires_at) {
    const expiresAt = new Date(providerData.expires_at);
    if (!isNaN(expiresAt.getTime()) && expiresAt <= new Date()) return null;
  }
  return accessToken;
}
