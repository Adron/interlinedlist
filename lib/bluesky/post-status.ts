/**
 * Cross-post a message to Bluesky via AT Protocol.
 * Supports threaded posts when content exceeds 300 chars, distributes images (4 per post).
 * Video support is Phase 2 - not implemented.
 */

const BLUESKY_CHAR_LIMIT = 300;
const BLUESKY_IMAGES_PER_POST = 4;

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

interface BlobRef {
  $type?: string;
  ref: { $link: string };
  mimeType: string;
  size: number;
}

async function uploadImageToBluesky(
  session: { fetchHandler: (path: string, init?: RequestInit) => Promise<Response> },
  imageUrl: string
): Promise<BlobRef | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const mimeType = imageUrl.includes('video') ? 'video/mp4' : 'image/jpeg';

    const uploadRes = await session.fetchHandler('/xrpc/com.atproto.repo.uploadBlob', {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
      },
      body: arrayBuffer,
    });

    if (!uploadRes.ok) return null;
    const data = (await uploadRes.json()) as { blob?: BlobRef };
    return data.blob ?? null;
  } catch {
    return null;
  }
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
    const { splitTextForPlatform } = await import('@/lib/crosspost/text-splitter');
    const { distributeMedia } = await import('@/lib/crosspost/media-distributor');

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

    const textChunks = splitTextForPlatform(options.content, BLUESKY_CHAR_LIMIT);
    const mediaPayloads = distributeMedia(
      options.imageUrls || [],
      options.videoUrls || [],
      'bluesky'
    );

    const numPosts = Math.max(textChunks.length, mediaPayloads.length, 1);
    let rootUri: string | undefined;
    let rootCid: string | undefined;
    let parentUri: string | undefined;
    let parentCid: string | undefined;
    let firstPostRkey: string | undefined;

    for (let i = 0; i < numPosts; i++) {
      const text = (textChunks[i] ?? '').trim() || (mediaPayloads[i] ? '.' : '');
      const mediaPayload = mediaPayloads[i];

      const embedImages: Array<{ image: BlobRef; alt: string }> = [];
      if (mediaPayload?.images) {
        for (const url of mediaPayload.images.slice(0, BLUESKY_IMAGES_PER_POST)) {
          const blob = await uploadImageToBluesky(session, url);
          if (blob) {
            embedImages.push({ image: blob, alt: '' });
          }
        }
      }

      const record: Record<string, unknown> = {
        $type: 'app.bsky.feed.post',
        text,
        createdAt: new Date().toISOString(),
      };

      if (embedImages.length > 0) {
        record.embed = {
          $type: 'app.bsky.embed.images',
          images: embedImages,
        };
      }

      const bodyObj: Record<string, unknown> = {
        repo: did,
        collection: 'app.bsky.feed.post',
        record,
      };

      if (parentUri && parentCid && rootUri && rootCid) {
        bodyObj.reply = {
          parent: { uri: parentUri, cid: parentCid },
          root: { uri: rootUri, cid: rootCid },
        };
      }

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
          providerId: identity.id,
          instanceName: 'Bluesky',
          success: false,
          error: errMessage,
        };
      }

      const data = (await response.json()) as { uri?: string; cid?: string };
      const uri = data.uri;
      const cid = data.cid;
      const rkey = uri ? uri.split('/').pop() : undefined;

      if (!rootUri && uri && cid) {
        rootUri = uri;
        rootCid = cid;
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
