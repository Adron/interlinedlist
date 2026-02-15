/**
 * Cross-post replies to Mastodon and Bluesky.
 * Used when replying to a message that was cross-posted and the replying user
 * follows the original author on that platform.
 */

import type { CrossPostUrl } from '@/lib/types';

export interface ReplyCrossPostResult {
  platform: string;
  instanceName: string;
  success: boolean;
  url?: string;
  error?: string;
}

interface MastodonProviderData {
  access_token: string;
  instance_url: string;
}

interface LinkedIdentityWithMastodon {
  id: string;
  provider: string;
  providerUsername: string | null;
  providerData: MastodonProviderData | null;
}

interface BlueskyProviderData {
  did?: string;
  handle?: string;
  tokenSet?: unknown;
  dpopJwk?: unknown;
}

interface LinkedIdentityWithBluesky {
  id: string;
  provider: string;
  providerUsername: string | null;
  providerData: BlueskyProviderData | null;
}

const MASTODON_CHAR_LIMIT = 500;

/**
 * Post a reply to Mastodon. Parent must have statusId and instanceUrl.
 * Uses replying user's token; instance must match parent's instance.
 */
export async function replyToMastodon(
  replyingUserIdentity: LinkedIdentityWithMastodon,
  parentCrossPost: CrossPostUrl & { statusId: string; instanceUrl: string },
  replyContent: string,
  publiclyVisible: boolean
): Promise<ReplyCrossPostResult> {
  const providerData = replyingUserIdentity.providerData as MastodonProviderData | null;
  if (!providerData?.access_token || !providerData?.instance_url) {
    return {
      platform: 'mastodon',
      instanceName: parentCrossPost.instanceName,
      success: false,
      error: 'Missing Mastodon credentials',
    };
  }

  const instanceUrl = providerData.instance_url.replace(/\/$/, '');
  const parentInstance = parentCrossPost.instanceUrl?.replace(/\/$/, '');
  if (!parentInstance || instanceUrl !== parentInstance) {
    return {
      platform: 'mastodon',
      instanceName: parentCrossPost.instanceName,
      success: false,
      error: 'Instance mismatch - reply must be on same Mastodon instance',
    };
  }

  const visibility = publiclyVisible ? 'public' : 'private';

  try {
    const { splitTextForPlatform } = await import('@/lib/crosspost/text-splitter');
    const textChunks = splitTextForPlatform(replyContent, MASTODON_CHAR_LIMIT);
    let lastStatusId = parentCrossPost.statusId;
    let firstPostUrl: string | undefined;

    for (let i = 0; i < textChunks.length; i++) {
      const text = (textChunks[i] ?? '').trim() || '.';
      const formData = new URLSearchParams();
      formData.append('status', text);
      formData.append('visibility', visibility);
      formData.append('in_reply_to_id', lastStatusId);

      const statusRes = await fetch(`${instanceUrl}/api/v1/statuses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${providerData.access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!statusRes.ok) {
        const errData = (await statusRes.json().catch(() => ({}))) as { error?: string };
        return {
          platform: 'mastodon',
          instanceName: parentCrossPost.instanceName,
          success: false,
          error: errData.error || `HTTP ${statusRes.status}`,
        };
      }

      const statusData = (await statusRes.json()) as { id?: string; url?: string };
      lastStatusId = statusData.id ?? lastStatusId;
      if (!firstPostUrl && statusData.url) {
        firstPostUrl = statusData.url;
      }
    }

    return {
      platform: 'mastodon',
      instanceName: parentCrossPost.instanceName,
      success: true,
      url: firstPostUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      platform: 'mastodon',
      instanceName: parentCrossPost.instanceName,
      success: false,
      error: message,
    };
  }
}

/**
 * Post a reply to Bluesky. Parent must have uri and cid.
 */
export async function replyToBluesky(
  replyingUserIdentity: LinkedIdentityWithBluesky,
  parentCrossPost: CrossPostUrl & { uri: string; cid: string },
  replyContent: string,
  publiclyVisible: boolean
): Promise<ReplyCrossPostResult> {
  const providerData = replyingUserIdentity.providerData as BlueskyProviderData | null;

  if (!providerData?.tokenSet || !providerData?.dpopJwk) {
    return {
      platform: 'bluesky',
      instanceName: parentCrossPost.instanceName,
      success: false,
      error: 'Bluesky account needs to be re-linked. Please disconnect and reconnect in Settings.',
    };
  }

  const did =
    providerData.did ?? (providerData.tokenSet as { sub?: string } | undefined)?.sub;
  let handle = replyingUserIdentity.providerUsername || providerData.handle || did;

  if (!did) {
    return {
      platform: 'bluesky',
      instanceName: parentCrossPost.instanceName,
      success: false,
      error: 'Bluesky account needs to be re-linked.',
    };
  }

  try {
    const { NodeOAuthClient, OAuthClient } = await import('@atproto/oauth-client-node');
    const { createProviderDataSessionStore } = await import('@/lib/bluesky/session-from-provider-data');
    const { getBlueskyConfig } = await import('@/lib/auth/oauth-bluesky');
    const { prisma } = await import('@/lib/prisma');
    const { blueskyStateStore } = await import('@/lib/auth/oauth-bluesky-stores');
    const { splitTextForPlatform } = await import('@/lib/crosspost/text-splitter');

    const BLUESKY_CHAR_LIMIT = 300;
    const textChunks = splitTextForPlatform(replyContent, BLUESKY_CHAR_LIMIT);

    const { clientId } = getBlueskyConfig();
    const metadata = await OAuthClient.fetchMetadata({
      clientId: clientId as `https://${string}/${string}`,
    });

    const sessionStore = createProviderDataSessionStore(
      did,
      providerData,
      replyingUserIdentity.id,
      prisma
    );

    const client = new NodeOAuthClient({
      clientMetadata: metadata,
      stateStore: blueskyStateStore,
      sessionStore,
    });

    const session = await client.restore(did);
    if (!session) {
      return {
        platform: 'bluesky',
        instanceName: parentCrossPost.instanceName,
        success: false,
        error: 'Could not restore Bluesky session',
      };
    }

    const isDid = (s: string) => s.startsWith('did:');
    if (handle && isDid(handle)) {
      try {
        const aud = (providerData.tokenSet as { aud?: string } | undefined)?.aud ?? 'https://bsky.social';
        const pdsUrl = aud.replace(/\/$/, '');
        const describeRes = await fetch(
          `${pdsUrl}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(did)}`
        );
        if (describeRes.ok) {
          const describeData = (await describeRes.json()) as { handle?: string };
          if (describeData.handle) handle = describeData.handle;
        }
      } catch {
        // Keep DID if resolve fails
      }
    }

    let parentUri = parentCrossPost.uri;
    let parentCid = parentCrossPost.cid;
    const rootUri = parentCrossPost.uri;
    const rootCid = parentCrossPost.cid;

    let firstPostRkey: string | undefined;

    for (let i = 0; i < textChunks.length; i++) {
      const text = (textChunks[i] ?? '').trim() || '.';

      const record: Record<string, unknown> = {
        $type: 'app.bsky.feed.post',
        text,
        createdAt: new Date().toISOString(),
        reply: {
          parent: { uri: parentUri, cid: parentCid },
          root: { uri: rootUri, cid: rootCid },
        },
      };

      const bodyObj: Record<string, unknown> = {
        repo: did,
        collection: 'app.bsky.feed.post',
        record,
      };

      const response = await session.fetchHandler('/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyObj),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMessage: string;
        try {
          const errJson = JSON.parse(errText) as { error?: string; message?: string };
          errMessage = errJson.error || errJson.message || errText || `HTTP ${response.status}`;
        } catch {
          errMessage = errText || `HTTP ${response.status}`;
        }
        return {
          platform: 'bluesky',
          instanceName: parentCrossPost.instanceName,
          success: false,
          error: errMessage,
        };
      }

      const data = (await response.json()) as { uri?: string; cid?: string };
      const uri = data.uri;
      const cid = data.cid;
      const rkey = uri ? uri.split('/').pop() : undefined;

      if (!firstPostRkey && rkey) {
        firstPostRkey = rkey;
      }
      if (uri && cid) {
        parentUri = uri;
        parentCid = cid;
      }
    }

    const url =
      firstPostRkey && handle
        ? `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${firstPostRkey}`
        : undefined;

    return {
      platform: 'bluesky',
      instanceName: parentCrossPost.instanceName,
      success: true,
      url,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      platform: 'bluesky',
      instanceName: parentCrossPost.instanceName,
      success: false,
      error: message,
    };
  }
}
