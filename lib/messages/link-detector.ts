/**
 * Link detection and platform identification utilities
 */

export type Platform = 'instagram' | 'bluesky' | 'threads' | 'mastodon' | 'other';

export interface DetectedLink {
  url: string;
  platform: Platform;
}

/**
 * URL regex pattern to match URLs in text
 * Matches http://, https://, and www. URLs
 */
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * Platform detection patterns
 */
const PLATFORM_PATTERNS: Array<{ platform: Platform; patterns: RegExp[] }> = [
  {
    platform: 'instagram',
    patterns: [
      /instagram\.com\/p\//i,
      /instagram\.com\/reel\//i,
      /instagram\.com\/tv\//i,
      /instagr\.am\/p\//i,
    ],
  },
  {
    platform: 'bluesky',
    patterns: [
      /bsky\.app\/profile\//i,
      /bsky\.app\/post\//i,
    ],
  },
  {
    platform: 'threads',
    patterns: [
      /threads\.net\/@/i,
      /threads\.net\/t\//i,
    ],
  },
  {
    platform: 'mastodon',
    patterns: [
      // Mastodon post URLs: /@username/status/123456
      /\/@[\w\.-]+\/status\/\d+/i,
      // Mastodon instance domains (common patterns)
      /mastodon\.social/i,
      /mastodon\.online/i,
      /mastodon\.xyz/i,
      /mstdn\./i,
      /m\.social/i,
      /masto\./i,
      // Generic mastodon pattern (fallback)
      /mastodon\./i,
    ],
  },
];

/**
 * Detects the platform type from a URL
 */
export function detectPlatform(url: string): Platform {
  const normalizedUrl = url.toLowerCase();
  
  for (const { platform, patterns } of PLATFORM_PATTERNS) {
    if (patterns.some(pattern => pattern.test(normalizedUrl))) {
      return platform;
    }
  }
  
  return 'other';
}

/**
 * Extracts all URLs from message content
 */
export function extractUrls(content: string): string[] {
  const matches = content.match(URL_REGEX);
  if (!matches) {
    return [];
  }
  
  // Normalize URLs (add https:// if missing for www. URLs)
  return matches.map(url => {
    if (url.startsWith('www.')) {
      return `https://${url}`;
    }
    return url;
  });
}

/**
 * Detects all links in message content and identifies their platforms
 */
export function detectLinks(content: string): DetectedLink[] {
  const urls = extractUrls(content);
  const uniqueUrls = Array.from(new Set(urls)); // Remove duplicates
  
  return uniqueUrls.map(url => ({
    url,
    platform: detectPlatform(url),
  }));
}
