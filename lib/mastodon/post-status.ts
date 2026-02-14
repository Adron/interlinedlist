/**
 * Cross-post a message to Mastodon.
 * Uploads media from URLs, truncates text to 500 chars, posts status.
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

    // 202: media still processing - wait before including in status
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

  try {
    // Truncate content for Mastodon
    const status = options.content.length > MASTODON_CHAR_LIMIT
      ? options.content.slice(0, MASTODON_CHAR_LIMIT - 3) + '...'
      : options.content;

    const visibility = options.publiclyVisible ? 'public' : 'private';

    // Upload media
    const mediaIds: string[] = [];
    const allMediaUrls = [
      ...(options.imageUrls || []),
      ...(options.videoUrls || []),
    ];

    for (const url of allMediaUrls) {
      const mimeType = url.includes('video') ? 'video/mp4' : 'image/jpeg';
      const mediaId = await uploadMediaToMastodon(instanceUrl, accessToken, url, mimeType);
      if (mediaId) mediaIds.push(mediaId);
    }

    // Build form data for status
    const formData = new URLSearchParams();
    formData.append('status', status);
    formData.append('visibility', visibility);
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

    const statusData = (await statusRes.json()) as { url?: string };
    return {
      providerId: identity.id,
      instanceName,
      success: true,
      url: statusData.url,
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
