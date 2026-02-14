/**
 * Bluesky (AT Protocol) OAuth helpers
 * Uses @atproto/oauth-client-node for the full OAuth flow
 */

import { APP_URL } from '@/lib/config/app';

export const BLUESKY_PROVIDER = 'bluesky';

/** RFC 8252: localhost not allowed in redirect_uris; use 127.0.0.1 for loopback. */
function oauthSafeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

/** URL to the OAuth client metadata JSON. Used as client_id in Bluesky OAuth. */
export function getClientMetadataUrl(): string {
  return oauthSafeUrl(`${APP_URL}/api/oauth/client-metadata`);
}

export function getBlueskyConfig() {
  const clientId = process.env.BLUESKY_CLIENT_ID || getClientMetadataUrl();
  return { clientId };
}
