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
      // Mastodon post URLs: /@username/status/123456 or /@username/123456
      /\/@[\w\.-]+\/(?:status\/)?\d+/i,
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

/** Strip trailing punctuation often captured with pasted URLs */
function trimTrailingFromUrl(url: string): string {
  return url.replace(/[),.;>'"\]}]+$/u, '');
}

/**
 * Normalizes an Instagram URL for deduplication (HTTPS, strip common tracking params).
 */
export function normalizeInstagramUrl(url: string): string {
  let raw = trimTrailingFromUrl(url.trim());
  if (!raw) return raw;
  if (!/^https?:\/\//i.test(raw)) {
    raw = raw.startsWith('www.') ? `https://${raw}` : `https://${raw}`;
  }
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (!host.endsWith('instagram.com') && host !== 'instagr.am') {
      return trimTrailingFromUrl(url.trim());
    }
    const stripKeys = [
      'igsh',
      'igshid',
      'fbclid',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
    ];
    stripKeys.forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return trimTrailingFromUrl(url.trim());
  }
}

/**
 * Instagram links parsed from message body text only (option 1): extract, normalize, dedupe.
 */
export function extractInstagramUrlsFromText(content: string): string[] {
  const urls = extractUrls(content).map(trimTrailingFromUrl);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const platform = detectPlatform(raw);
    if (platform !== 'instagram') continue;
    const norm = normalizeInstagramUrl(raw);
    if (!seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
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
  return matches.map((url) => {
    let u = trimTrailingFromUrl(url);
    if (u.startsWith('www.')) {
      return `https://${u}`;
    }
    return u;
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
