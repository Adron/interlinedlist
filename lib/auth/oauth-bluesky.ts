/**
 * Bluesky (AT Protocol) OAuth helpers
 * Uses @atproto/oauth-client-node for the full OAuth flow
 *
 * NOTE — token refresh is handled by @atproto/oauth-client-node, not by an
 * app-level helper. AT Protocol access tokens are DPoP-bound: refresh
 * requires a DPoP proof signed with the same key used during the original
 * handshake. The cross-post path in lib/bluesky/post-status.ts calls
 * NodeOAuthClient.restore(did), which proactively refreshes the token when
 * needed (using the stored dpopJwk) and persists the rotated tokenSet back
 * to LinkedIdentity.providerData via the store from
 * lib/bluesky/session-from-provider-data.ts. There is intentionally no
 * getValidBlueskyAccessToken() helper — implementing DPoP refresh outside
 * the library would duplicate non-trivial cryptography. If restore() throws
 * TokenRefreshError / TokenInvalidError, the cross-post surfaces a
 * "please re-link your Bluesky account" error.
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

/**
 * Returns a fetch function backed by undici that works with NodeOAuthClient.
 *
 * Undici's fetch rejects Request objects that weren't created by undici's own
 * Request constructor (e.g. the global Request class patched by Next.js on
 * Node.js 25). This wrapper decomposes any Request object into a plain URL +
 * init before forwarding to undici, so the OAuth metadata / token requests
 * never touch Next.js's patched globalThis.fetch.
 */
export async function getBlueskyFetch(): Promise<typeof fetch> {
  const { fetch: undiciFetch } = await import('undici');

  return function blueskyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof input === 'string' || input instanceof URL) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (undiciFetch as any)(input, init);
    }
    const req = input as Request;
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (undiciFetch as any)(req.url, {
      method: req.method,
      headers,
      body: req.body ?? undefined,
      // duplex is required when sending a streaming body (Node.js / undici)
      ...(req.body ? { duplex: 'half' } : {}),
      signal: req.signal ?? undefined,
      redirect: req.redirect as RequestRedirect,
      ...init,
    });
  } as typeof fetch;
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
