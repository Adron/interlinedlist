/**
 * Cross-post a message to Bluesky via AT Protocol.
 * Uses OAuth session from LinkedIdentity.providerData.
 */

const BLUESKY_CHAR_LIMIT = 300;

export interface BlueskyProviderData {
  did?: string;
  handle?: string;
  tokenSet?: unknown;
  dpopJwk?: unknown;
  authMethod?: string;
}

/** Accepts Prisma LinkedIdentity with providerData as JsonValue (object at runtime). */
interface LinkedIdentityWithData {
  id: string;
  provider: string;
  providerUsername: string | null;
  providerData: BlueskyProviderData | null;
}

export interface CrossPostOptions {
  content: string;
  publiclyVisible: boolean;
  imageUrls?: string[];
  videoUrls?: string[];
}

export interface CrossPostResult {
  providerId: string;
  instanceName: string;
  success: boolean;
  url?: string;
  error?: string;
}

export async function postToBluesky(
  identity: LinkedIdentityWithData,
  options: CrossPostOptions
): Promise<CrossPostResult> {
  const providerData = identity.providerData as BlueskyProviderData | null;

  if (!providerData?.tokenSet || !providerData?.dpopJwk) {
    return {
      providerId: identity.id,
      instanceName: 'Bluesky',
      success: false,
      error: 'Bluesky account needs to be re-linked. Please disconnect and reconnect in Settings.',
    };
  }

  const did = providerData.did ?? (providerData.tokenSet as { sub?: string } | undefined)?.sub;
  const handle = identity.providerUsername || providerData.handle || did;

  if (!did) {
    return {
      providerId: identity.id,
      instanceName: 'Bluesky',
      success: false,
      error: 'Bluesky account needs to be re-linked. Please disconnect and reconnect in Settings.',
    };
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

    const text =
      options.content.length > BLUESKY_CHAR_LIMIT
        ? options.content.slice(0, BLUESKY_CHAR_LIMIT - 3) + '...'
        : options.content;

    const record = {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
    };

    const body = JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record,
    });

    const response = await session.fetchHandler('/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
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
        providerId: identity.id,
        instanceName: 'Bluesky',
        success: false,
        error: errMessage,
      };
    }

    const data = (await response.json()) as { uri?: string };
    const uri = data.uri;
    const rkey = uri ? uri.split('/').pop() : undefined;
    const url =
      rkey && handle
        ? `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${rkey}`
        : undefined;

    return {
      providerId: identity.id,
      instanceName: 'Bluesky',
      success: true,
      url,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      providerId: identity.id,
      instanceName: 'Bluesky',
      success: false,
      error: message,
    };
  }
}
