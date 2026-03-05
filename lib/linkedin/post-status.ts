/**
 * Cross-post a message to LinkedIn.
 * Uses LinkedIn Posts API (REST). Text-only for MVP; images can be added later.
 */

const LINKEDIN_CHAR_LIMIT = 3000;

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

    const payload = {
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

    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'Linkedin-Version': '202405',
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
