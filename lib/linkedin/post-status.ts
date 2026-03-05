/**
 * Cross-post a message to LinkedIn.
 * Uses LinkedIn Posts API (REST). Supports text, single image, or multi-image (2-20) posts.
 */

const LINKEDIN_CHAR_LIMIT = 3000;
const LINKEDIN_API_VERSION = '202510';
const LINKEDIN_MAX_IMAGES = 20;

const LINKEDIN_HEADERS = {
  'Content-Type': 'application/json',
  'X-Restli-Protocol-Version': '2.0.0',
  'Linkedin-Version': LINKEDIN_API_VERSION,
} as const;

function inferMimeType(url: string, contentType: string | null): string {
  if (contentType && /^image\/(jpeg|png|gif)$/i.test(contentType)) {
    return contentType.split(';')[0].trim().toLowerCase();
  }
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function uploadImageToLinkedIn(
  accessToken: string,
  authorUrn: string,
  imageUrl: string
): Promise<string | null> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const arrayBuffer = await imgRes.arrayBuffer();
    const mimeType = inferMimeType(imageUrl, imgRes.headers.get('content-type'));

    const initRes = await fetch(
      'https://api.linkedin.com/rest/images?action=initializeUpload',
      {
        method: 'POST',
        headers: {
          ...LINKEDIN_HEADERS,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          initializeUploadRequest: { owner: authorUrn },
        }),
      }
    );

    if (!initRes.ok) return null;
    const initData = (await initRes.json()) as {
      value?: { uploadUrl?: string; image?: string };
    };
    const uploadUrl = initData.value?.uploadUrl;
    const imageUrn = initData.value?.image;
    if (!uploadUrl || !imageUrn) return null;

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: arrayBuffer,
    });

    if (!putRes.ok) return null;
    return imageUrn;
  } catch {
    return null;
  }
}

interface LinkedInProviderData {
  access_token: string;
  expires_in?: number;
}

interface LinkedIdentityWithData {
  id: string;
  provider: string;
  providerUserId: string;
  providerUsername: string | null;
  providerData: LinkedInProviderData | null;
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
  /** Post URN (urn:li:share:... or urn:li:ugcPost:...) for delete-on-delete */
  postId?: string;
  error?: string;
}

export async function postToLinkedIn(
  identity: LinkedIdentityWithData,
  options: CrossPostOptions
): Promise<CrossPostResult> {
  const providerData = identity.providerData as LinkedInProviderData | null;

  if (!providerData?.access_token) {
    return {
      providerId: identity.id,
      instanceName: 'LinkedIn',
      success: false,
      error: 'Missing LinkedIn credentials',
    };
  }

  const accessToken = providerData.access_token;
  const authorUrn = `urn:li:person:${identity.providerUserId}`;
  const visibility = options.publiclyVisible ? 'PUBLIC' : 'CONNECTIONS';

  try {
    const { splitTextForPlatform } = await import('@/lib/crosspost/text-splitter');
    const textChunks = splitTextForPlatform(options.content, LINKEDIN_CHAR_LIMIT);
    const commentary = (textChunks[0] ?? options.content.trim()) || ' ';

    const imageUrls = options.imageUrls?.filter(
      (u): u is string => typeof u === 'string' && u.length > 0
    );
    const urlsToUpload = (imageUrls ?? []).slice(0, LINKEDIN_MAX_IMAGES);

    let content: { media?: { id: string; altText: string }; multiImage?: { images: Array<{ id: string; altText: string }> } } | undefined;

    if (urlsToUpload.length > 0) {
      const imageUrns: string[] = [];
      for (const url of urlsToUpload) {
        const urn = await uploadImageToLinkedIn(accessToken, authorUrn, url);
        if (!urn) {
          return {
            providerId: identity.id,
            instanceName: 'LinkedIn',
            success: false,
            error: `Failed to upload image to LinkedIn`,
          };
        }
        imageUrns.push(urn);
      }

      if (imageUrns.length === 1) {
        content = { media: { id: imageUrns[0], altText: '' } };
      } else {
        content = {
          multiImage: {
            images: imageUrns.map((id) => ({ id, altText: '' })),
          },
        };
      }
    }

    const payload: Record<string, unknown> = {
      author: authorUrn,
      commentary,
      visibility,
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
    if (content) payload.content = content;

    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        ...LINKEDIN_HEADERS,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMessage = `HTTP ${response.status}`;
      try {
        const errData = JSON.parse(errText) as { message?: string; status?: number };
        errMessage = errData.message || errMessage;
      } catch {
        errMessage = errText || errMessage;
      }
      return {
        providerId: identity.id,
        instanceName: 'LinkedIn',
        success: false,
        error: errMessage,
      };
    }

    const postId = response.headers.get('x-restli-id');
    const url = postId
      ? `https://www.linkedin.com/feed/update/${postId}`
      : 'https://www.linkedin.com/feed/';

    return {
      providerId: identity.id,
      instanceName: 'LinkedIn',
      success: true,
      url,
      postId: postId ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      providerId: identity.id,
      instanceName: 'LinkedIn',
      success: false,
      error: message,
    };
  }
}
