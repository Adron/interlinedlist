/**
 * Check if the replying user follows the original author on external platforms.
 * Used to determine whether to cross-post replies to Bluesky/Mastodon.
 */

interface MastodonProviderData {
  access_token: string;
  instance_url: string;
}

interface LinkedIdentityWithMastodon {
  id: string;
  provider: string;
  providerUserId: string;
  providerData: MastodonProviderData | null;
}

interface BlueskyProviderData {
  did?: string;
  tokenSet?: unknown;
  dpopJwk?: unknown;
}

interface LinkedIdentityWithBluesky {
  id: string;
  provider: string;
  providerUserId: string;
  providerData: BlueskyProviderData | null;
}

/**
 * Check if replying user follows the original author on Mastodon.
 * Both must be on the same instance. Uses GET /api/v1/accounts/relationships.
 */
export async function isFollowingOnMastodon(
  replyingUserIdentity: LinkedIdentityWithMastodon,
  originalAuthorIdentity: LinkedIdentityWithMastodon,
  instanceUrl: string
): Promise<boolean> {
  const providerData = replyingUserIdentity.providerData as MastodonProviderData | null;
  if (!providerData?.access_token || !providerData?.instance_url) {
    return false;
  }

  const baseUrl = instanceUrl.replace(/\/$/, '');
  const replyingInstance = providerData.instance_url.replace(/\/$/, '');
  if (baseUrl !== replyingInstance) {
    return false;
  }

  const originalAccountId = originalAuthorIdentity.providerUserId;
  if (!originalAccountId) return false;

  try {
    const url = `${baseUrl}/api/v1/accounts/relationships?id[]=${encodeURIComponent(originalAccountId)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${providerData.access_token}`,
      },
    });

    if (!res.ok) return false;

    const data = (await res.json()) as Array<{ following?: boolean }>;
    const rel = data?.[0];
    return rel?.following === true;
  } catch {
    return false;
  }
}

/**
 * Check if replying user follows the original author on Bluesky.
 * Uses app.bsky.graph.getFollows with pagination.
 */
export async function isFollowingOnBluesky(
  replyingUserIdentity: LinkedIdentityWithBluesky,
  originalAuthorDid: string
): Promise<boolean> {
  const providerData = replyingUserIdentity.providerData as BlueskyProviderData | null;
  if (!providerData?.tokenSet || !providerData?.dpopJwk) {
    return false;
  }

  const replyingDid =
    providerData.did ?? (providerData.tokenSet as { sub?: string } | undefined)?.sub;
  if (!replyingDid || !originalAuthorDid) return false;

  if (replyingDid === originalAuthorDid) return true;

  try {
    const { NodeOAuthClient, OAuthClient } = await import('@atproto/oauth-client-node');
    const { createProviderDataSessionStore } = await import('@/lib/bluesky/session-from-provider-data');
    const { getBlueskyConfig } = await import('@/lib/auth/oauth-bluesky');
    const { prisma } = await import('@/lib/prisma');
    const { blueskyStateStore } = await import('@/lib/auth/oauth-bluesky-stores');

    const { clientId } = getBlueskyConfig();
    const metadata = await OAuthClient.fetchMetadata({
      clientId: clientId as `https://${string}/${string}`,
    });

    const sessionStore = createProviderDataSessionStore(
      replyingDid,
      providerData,
      replyingUserIdentity.id,
      prisma
    );

    const client = new NodeOAuthClient({
      clientMetadata: metadata,
      stateStore: blueskyStateStore,
      sessionStore,
    });

    const session = await client.restore(replyingDid);
    if (!session) return false;

    const aud = (providerData.tokenSet as { aud?: string } | undefined)?.aud ?? 'https://bsky.social';
    const pdsUrl = aud.replace(/\/$/, '');

    let cursor: string | undefined;
    do {
      const params = new URLSearchParams({
        actor: replyingDid,
        limit: '100',
        ...(cursor && { cursor }),
      });
      const res = await session.fetchHandler(
        `/xrpc/app.bsky.graph.getFollows?${params.toString()}`
      );

      if (!res.ok) return false;

      const data = (await res.json()) as {
        follows?: Array<{ did?: string }>;
        cursor?: string;
      };
      const follows = data.follows ?? [];

      for (const f of follows) {
        if (f.did === originalAuthorDid) return true;
      }

      cursor = data.cursor;
    } while (cursor);

    return false;
  } catch {
    return false;
  }
}
