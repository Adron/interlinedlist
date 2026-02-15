/**
 * Cross-post a message to Mastodon.
 * Supports threaded posts when content exceeds 500 chars, distributes images (4 per post),
 * and posts video separately (Mastodon cannot mix images and video).
 */

const MASTODON_CHAR_LIMIT = 500;

interface MastodonProviderData {
  access_token: string;
  instance_url: string;
}

interface LinkedIdentityWithData {
  id: string;
  provider: string;
  providerUsername: string | null;
  providerData: MastodonProviderData | null;
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
  statusId?: string;
  instanceUrl?: string;
  error?: string;
}

function getInstanceName(provider: string): string {
  return provider.startsWith('mastodon:') ? provider.replace('mastodon:', '') : provider;
}

async function uploadMediaToMastodon(
  instanceUrl: string,
  accessToken: string,
  mediaUrl: string,
  mimeType: string
): Promise<string | null> {
  try {
    const response = await fetch(mediaUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const formData = new FormData();
    const ext = mimeType.includes('video') ? 'mp4' : 'jpg';
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('file', blob, `upload.${ext}`);

    const uploadRes = await fetch(`${instanceUrl}/api/v2/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Mastodon media upload failed:', errText);
      return null;
    }

    const data = (await uploadRes.json()) as { id?: string };
    if (!data.id) return null;

    if (uploadRes.status === 202) {
      await new Promise((r) => setTimeout(r, 5000));
    }
    return String(data.id);
  } catch (err) {
    console.error('Mastodon media upload error:', err);
    return null;
  }
}

export async function postToMastodon(
  identity: LinkedIdentityWithData,
  options: CrossPostOptions
): Promise<CrossPostResult> {
  const instanceName = getInstanceName(identity.provider);
  const providerData = identity.providerData as MastodonProviderData | null;

  if (!providerData?.access_token || !providerData?.instance_url) {
    return {
      providerId: identity.id,
      instanceName,
      success: false,
      error: 'Missing Mastodon credentials',
    };
  }

  const instanceUrl = providerData.instance_url.replace(/\/$/, '');
  const accessToken = providerData.access_token;
  const visibility = options.publiclyVisible ? 'public' : 'private';

  try {
    const { splitTextForPlatform } = await import('@/lib/crosspost/text-splitter');
    const { distributeMedia } = await import('@/lib/crosspost/media-distributor');

    const textChunks = splitTextForPlatform(options.content, MASTODON_CHAR_LIMIT);
    const mediaPayloads = distributeMedia(
      options.imageUrls || [],
      options.videoUrls || [],
      'mastodon'
    );

    const numPosts = Math.max(textChunks.length, mediaPayloads.length, 1);
    let lastStatusId: string | null = null;
    let firstPostUrl: string | undefined;
    let firstStatusId: string | undefined;

    for (let i = 0; i < numPosts; i++) {
      const text = (textChunks[i] ?? '').trim() || (mediaPayloads[i] ? '.' : '');
      const mediaPayload = mediaPayloads[i];

      const mediaIds: string[] = [];
      if (mediaPayload?.images) {
        for (const url of mediaPayload.images) {
          const mediaId = await uploadMediaToMastodon(
            instanceUrl,
            accessToken,
            url,
            'image/jpeg'
          );
          if (mediaId) mediaIds.push(mediaId);
        }
      } else if (mediaPayload?.video) {
        const mediaId = await uploadMediaToMastodon(
          instanceUrl,
          accessToken,
          mediaPayload.video,
          'video/mp4'
        );
        if (mediaId) mediaIds.push(mediaId);
      }

      const formData = new URLSearchParams();
      formData.append('status', text);
      formData.append('visibility', visibility);
      if (lastStatusId) {
        formData.append('in_reply_to_id', lastStatusId);
      }
      for (const id of mediaIds) {
        formData.append('media_ids[]', id);
      }

      const statusRes = await fetch(`${instanceUrl}/api/v1/statuses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!statusRes.ok) {
        const errData = (await statusRes.json().catch(() => ({}))) as { error?: string };
        return {
          providerId: identity.id,
          instanceName,
          success: false,
          error: errData.error || `HTTP ${statusRes.status}`,
        };
      }

      const statusData = (await statusRes.json()) as { id?: string; url?: string };
      lastStatusId = statusData.id ?? null;
      if (!firstPostUrl && statusData.url) {
        firstPostUrl = statusData.url;
      }
      if (!firstStatusId && statusData.id) {
        firstStatusId = String(statusData.id);
      }
    }

    return {
      providerId: identity.id,
      instanceName,
      success: true,
      url: firstPostUrl,
      statusId: firstStatusId,
      instanceUrl: instanceUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      providerId: identity.id,
      instanceName,
      success: false,
      error: message,
    };
  }
}
