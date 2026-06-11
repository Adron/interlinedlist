/**
 * Cross-post a message to LinkedIn.
 * Uses LinkedIn Posts API (REST). Supports text, single image, multi-image (2-20), article (link preview),
 * and optionally posting URLs as the first comment instead of in the post body.
 */

const LINKEDIN_CHAR_LIMIT = 3000;
const LINKEDIN_ARTICLE_TITLE_LIMIT = 400;
const LINKEDIN_ARTICLE_DESC_LIMIT = 256;
const LINKEDIN_API_VERSION = '202510';
const LINKEDIN_MAX_IMAGES = 20;

// Matches http(s):// and bare www. URLs — kept in sync with link-detector URL_REGEX
const URL_STRIP_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

const LINKEDIN_HEADERS = {
  'Content-Type': 'application/json',
  'X-Restli-Protocol-Version': '2.0.0',
  'Linkedin-Version': LINKEDIN_API_VERSION,
} as const;

function truncateForLinkedIn(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= LINKEDIN_CHAR_LIMIT) return trimmed;
  const candidate = trimmed.slice(0, LINKEDIN_CHAR_LIMIT);
  const lastSpace = candidate.lastIndexOf(' ');
  return (lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate).trimEnd();
}

function stripUrlsFromContent(content: string): string {
  return content
    .replace(URL_STRIP_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

async function postLinkedInComment(
  accessToken: string,
  authorUrn: string,
  postUrn: string,
  text: string
): Promise<boolean> {
  try {
    const encodedUrn = encodeURIComponent(postUrn);
    const response = await fetch(
      `https://api.linkedin.com/rest/socialActions/${encodedUrn}/comments`,
      {
        method: 'POST',
        headers: {
          ...LINKEDIN_HEADERS,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          actor: authorUrn,
          message: { text },
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export interface LinkedInPostTarget {
  accessToken: string;
  authorUrn: string;
  credentialId: string;
}

export interface CrossPostOptions {
  content: string;
  publiclyVisible: boolean;
  imageUrls?: string[];
  videoUrls?: string[];
  linkAsFirstComment?: boolean;
}

export interface CrossPostResult {
  providerId: string;
  instanceName: string;
  success: boolean;
  url?: string;
  /** Post URN (urn:li:share:... or urn:li:ugcPost:...) for delete-on-delete */
  postId?: string;
  error?: string;
  /** Non-fatal warning, e.g. post succeeded but first-comment(s) failed */
  warning?: string;
}

type LinkedInContent =
  | { media: { id: string; altText: string } }
  | { multiImage: { images: Array<{ id: string; altText: string }> } }
  | { article: { source: string; title: string; description?: string; thumbnail?: string } };

export async function postToLinkedIn(
  target: LinkedInPostTarget,
  options: CrossPostOptions
): Promise<CrossPostResult> {
  const { accessToken, authorUrn, credentialId } = target;
  const visibility = options.publiclyVisible ? 'PUBLIC' : 'CONNECTIONS';

  try {
    const { extractUrls } = await import('@/lib/messages/link-detector');
    const detectedUrls = extractUrls(options.content);

    // Build commentary: strip URLs from body when posting them as first comment
    const rawText = options.linkAsFirstComment && detectedUrls.length > 0
      ? stripUrlsFromContent(options.content)
      : options.content;
    const commentary = truncateForLinkedIn(rawText) || ' ';

    const imageUrls = options.imageUrls?.filter(
      (u): u is string => typeof u === 'string' && u.length > 0
    );
    const urlsToUpload = (imageUrls ?? []).slice(0, LINKEDIN_MAX_IMAGES);

    let content: LinkedInContent | undefined;

    if (urlsToUpload.length > 0) {
      // Attached images take priority over article previews
      const imageUrns: string[] = [];
      for (const url of urlsToUpload) {
        const urn = await uploadImageToLinkedIn(accessToken, authorUrn, url);
        if (!urn) {
          return {
            providerId: credentialId,
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
    } else if (!options.linkAsFirstComment && detectedUrls.length > 0) {
      // No images and not first-comment mode — build a link preview card
      const { fetchLinkMetadata } = await import('@/lib/messages/metadata-fetcher');
      try {
        const firstUrl = detectedUrls[0];
        const meta = await fetchLinkMetadata({ url: firstUrl, platform: 'other' });
        const title = meta?.metadata?.title?.trim();

        if (title) {
          const article: { source: string; title: string; description?: string; thumbnail?: string } = {
            source: firstUrl,
            title: title.slice(0, LINKEDIN_ARTICLE_TITLE_LIMIT),
          };

          const description = meta?.metadata?.description?.trim();
          if (description) {
            article.description = description.slice(0, LINKEDIN_ARTICLE_DESC_LIMIT);
          }

          const thumbnailUrl = meta?.metadata?.thumbnail;
          if (thumbnailUrl) {
            const thumbnailUrn = await uploadImageToLinkedIn(accessToken, authorUrn, thumbnailUrl);
            if (thumbnailUrn) {
              article.thumbnail = thumbnailUrn;
            }
          }

          content = { article };
        }
      } catch {
        // Metadata fetch failed — fall through to text-only post
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
        providerId: credentialId,
        instanceName: 'LinkedIn',
        success: false,
        error: errMessage,
      };
    }

    const postId = response.headers.get('x-restli-id');
    const url = postId
      ? `https://www.linkedin.com/feed/update/${postId}`
      : 'https://www.linkedin.com/feed/';

    // Post each detected URL as its own first comment
    let warning: string | undefined;
    if (options.linkAsFirstComment && detectedUrls.length > 0 && postId) {
      const failed: string[] = [];
      for (const commentUrl of detectedUrls) {
        const ok = await postLinkedInComment(accessToken, authorUrn, postId, commentUrl);
        if (!ok) failed.push(commentUrl);
      }
      if (failed.length > 0) {
        warning = `Post published but ${failed.length} link comment${failed.length > 1 ? 's' : ''} could not be posted`;
      }
    }

    return {
      providerId: credentialId,
      instanceName: 'LinkedIn',
      success: true,
      url,
      postId: postId ?? undefined,
      ...(warning && { warning }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      providerId: credentialId,
      instanceName: 'LinkedIn',
      success: false,
      error: message,
    };
  }
}
