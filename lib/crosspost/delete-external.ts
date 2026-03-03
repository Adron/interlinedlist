/**
 * Delete cross-posted content from Bluesky and Mastodon when a message is deleted.
 * Uses stored URIs (Bluesky) and status IDs (Mastodon) from crossPostUrls.
 */

interface BlueskyProviderData {
  did?: string;
  tokenSet?: unknown;
  dpopJwk?: unknown;
}

interface LinkedIdentityWithBluesky {
  id: string;
  provider: string;
  providerData: BlueskyProviderData | null;
}

interface MastodonProviderData {
  access_token: string;
  instance_url: string;
}

interface LinkedIdentityWithMastodon {
  id: string;
  provider: string;
  providerData: MastodonProviderData | null;
}

/** Parse at:// URI into repo, collection, rkey */
function parseAtUri(uri: string): { repo: string; collection: string; rkey: string } | null {
  if (!uri.startsWith('at://')) return null;
  const parts = uri.slice(5).split('/');
  if (parts.length < 3) return null;
  return {
    repo: parts[0],
    collection: parts[1],
    rkey: parts[2],
  };
}

/**
 * Delete a Bluesky post (or thread). Deletes in reverse order so replies are removed first.
 */
export async function deletePostOnBluesky(
  identity: LinkedIdentityWithBluesky,
  uris: string[]
): Promise<{ success: boolean; error?: string }> {
  const providerData = identity.providerData as BlueskyProviderData | null;
  if (!providerData?.tokenSet || !providerData?.dpopJwk) {
    return { success: false, error: 'Bluesky account needs to be re-linked' };
  }

  const did = providerData.did ?? (providerData.tokenSet as { sub?: string } | undefined)?.sub;
  if (!did) {
    return { success: false, error: 'Missing Bluesky DID' };
  }

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
      did,
      providerData,
      identity.id,
      prisma
    );

    const client = new NodeOAuthClient({
      clientMetadata: metadata,
      stateStore: blueskyStateStore,
      sessionStore,
    });

    const session = await client.restore(did);
    if (!session?.fetchHandler) {
      return { success: false, error: 'Could not restore Bluesky session' };
    }

    // Delete in reverse order (replies first, then root)
    const urisToDelete = [...uris].reverse();
    for (const uri of urisToDelete) {
      const parsed = parseAtUri(uri);
      if (!parsed || parsed.collection !== 'app.bsky.feed.post') continue;

      const res = await session.fetchHandler('/xrpc/com.atproto.repo.deleteRecord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: parsed.repo,
          collection: parsed.collection,
          rkey: parsed.rkey,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Bluesky deleteRecord failed:', uri, errText);
        // Continue with other URIs; one failure shouldn't block the rest
      }
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Delete a Mastodon status (or thread). Deletes in reverse order so replies are removed first.
 */
export async function deletePostOnMastodon(
  identity: LinkedIdentityWithMastodon,
  instanceUrl: string,
  statusIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const providerData = identity.providerData as MastodonProviderData | null;
  if (!providerData?.access_token || !providerData?.instance_url) {
    return { success: false, error: 'Missing Mastodon credentials' };
  }

  const baseUrl = providerData.instance_url.replace(/\/$/, '');
  if (baseUrl !== instanceUrl.replace(/\/$/, '')) {
    return { success: false, error: 'Instance mismatch' };
  }

  const accessToken = providerData.access_token;

  try {
    // Delete in reverse order (replies first, then root)
    const idsToDelete = [...statusIds].reverse();
    for (const id of idsToDelete) {
      const res = await fetch(`${baseUrl}/api/v1/statuses/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Mastodon delete status failed:', id, errText);
        // Continue with other IDs
      }
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}
