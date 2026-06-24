/**
 * Verify a linked Bluesky identity by restoring its AT Protocol OAuth session
 * and making an authenticated call to the user's PDS.
 *
 * Bluesky uses DPoP-bound OAuth tokens stored in providerData.tokenSet /
 * providerData.dpopJwk — there is no plain `access_token` string like the other
 * providers. Restoring the session validates (and refreshes, if needed) the
 * token; com.atproto.server.getSession then confirms it server-side.
 */

import type { PrismaClient } from '@prisma/client';
import type { BlueskyProviderData } from '@/lib/bluesky/session-from-provider-data';

export interface BlueskyVerifyIdentity {
  id: string;
  provider: string;
  providerUsername: string | null;
  /** Prisma JsonValue at runtime; narrowed to BlueskyProviderData below. */
  providerData: unknown;
}

/**
 * Returns true if the identity's Bluesky session is valid. Returns false when
 * the stored credentials are incomplete; throws when the token is present but
 * rejected by the PDS (e.g. revoked/expired), so callers can surface a re-link
 * prompt.
 */
export async function verifyBlueskyIdentity(
  identity: BlueskyVerifyIdentity,
  prisma: PrismaClient
): Promise<boolean> {
  const providerData = identity.providerData as BlueskyProviderData | null;
  if (!providerData?.tokenSet || !providerData?.dpopJwk) {
    return false;
  }

  const did =
    providerData.did ?? (providerData.tokenSet as { sub?: string } | undefined)?.sub;
  if (!did) {
    return false;
  }

  const { NodeOAuthClient } = await import('@atproto/oauth-client-node');
  const { createProviderDataSessionStore } = await import(
    '@/lib/bluesky/session-from-provider-data'
  );
  const { getBlueskyClientMetadata, getBlueskyFetch } = await import(
    '@/lib/auth/oauth-bluesky'
  );
  const { blueskyStateStore } = await import('@/lib/auth/oauth-bluesky-stores');

  const blueskyFetch = await getBlueskyFetch();
  const metadata = getBlueskyClientMetadata();
  const sessionStore = createProviderDataSessionStore(
    did,
    providerData,
    identity.id,
    prisma
  );

  const client = new NodeOAuthClient({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientMetadata: metadata as any,
    stateStore: blueskyStateStore,
    sessionStore,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: blueskyFetch as any,
  });

  // restore() throws TokenInvalidError / TokenRevoked / TokenRefreshError when
  // the stored session can no longer be used.
  const session = await client.restore(did);

  const res = await session.fetchHandler('/xrpc/com.atproto.server.getSession', {
    method: 'GET',
  });

  return res.ok;
}
