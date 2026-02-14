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

/** OAuth client metadata object. Use this instead of fetching to avoid network failures. */
export function getBlueskyClientMetadata() {
  const { clientId } = getBlueskyConfig();
  const callbackUrl = clientId.replace('/api/oauth/client-metadata', '/api/auth/bluesky/callback');
  return {
    client_id: clientId,
    client_name: 'InterlinedList',
    client_uri: APP_URL,
    application_type: 'web',
    dpop_bound_access_tokens: true,
    grant_types: ['authorization_code', 'refresh_token'],
    redirect_uris: [callbackUrl],
    response_types: ['code'],
    scope: 'atproto transition:generic',
    token_endpoint_auth_method: 'none',
  };
}
