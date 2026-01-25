/**
 * Metadata fetching service for social media links
 * Uses Open Graph tags and platform-specific methods
 */

import { Platform, DetectedLink } from './link-detector';
import { LinkMetadataItem } from '@/lib/types';

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
}

/**
 * Validates URL to prevent SSRF attacks
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts Open Graph meta tags from HTML
 */
function extractOpenGraphTags(html: string): OpenGraphData {
  const ogData: OpenGraphData = {};
  
  // Extract og:title (handle both property and name attributes, and different quote styles)
  const titlePatterns = [
    /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:title["']/i,
  ];
  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match) {
      ogData.title = match[1];
      break;
    }
  }
  
  // Extract og:description
  const descPatterns = [
    /<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:description["']/i,
  ];
  for (const pattern of descPatterns) {
    const match = html.match(pattern);
    if (match) {
      ogData.description = match[1];
      break;
    }
  }
  
  // Extract og:image (try multiple variations)
  const imagePatterns = [
    /<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i,
    /<meta\s+(?:property|name)=["']og:image:url["']\s+content=["']([^"']+)["']/i,
    /<meta\s+(?:property|name)=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i,
    // Twitter Card images as fallback
    /<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:image["']/i,
  ];
  for (const pattern of imagePatterns) {
    const match = html.match(pattern);
    if (match) {
      ogData.image = match[1];
      break;
    }
  }
  
  // Extract og:type
  const typeMatch = html.match(/<meta\s+(?:property|name)=["']og:type["']\s+content=["']([^"']+)["']/i);
  if (typeMatch) {
    ogData.type = typeMatch[1];
  }
  
  return ogData;
}

/**
 * Normalizes image URL - converts relative URLs to absolute
 */
function normalizeImageUrl(imageUrl: string, baseUrl: string): string {
  try {
    // If already absolute, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // If protocol-relative (starts with //), add https:
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`;
    }
    // Otherwise, resolve relative to base URL
    const base = new URL(baseUrl);
    return new URL(imageUrl, base).toString();
  } catch {
    // If URL parsing fails, return original
    return imageUrl;
  }
}

/**
 * Extracts images from HTML as fallback
 */
function extractFallbackImage(html: string, baseUrl: string): string | undefined {
  // Look for large images in the HTML (likely to be featured images)
  const imgPatterns = [
    /<img[^>]+src=["']([^"']+)["'][^>]*(?:class|id)=["'][^"']*(?:hero|featured|main|cover|thumbnail|preview)[^"']*["']/i,
    /<img[^>]*(?:class|id)=["'][^"']*(?:hero|featured|main|cover|thumbnail|preview)[^"']*["'][^>]+src=["']([^"']+)["']/i,
  ];
  for (const pattern of imgPatterns) {
    const match = html.match(pattern);
    if (match) {
      const imgSrc = match[1] || match[2];
      if (imgSrc) {
        return normalizeImageUrl(imgSrc, baseUrl);
      }
    }
  }
  return undefined;
}

/**
 * Fetches HTML content from a URL with timeout
 */
async function fetchHtml(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InterlinedList/1.0; +https://interlinedlist.com)',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetches metadata for a single link
 */
export async function fetchLinkMetadata(
  link: DetectedLink
): Promise<Omit<LinkMetadataItem, 'fetchStatus' | 'fetchedAt'> | null> {
  const { url, platform } = link;
  
  // Validate URL
  if (!isValidUrl(url)) {
    return null;
  }
  
  try {
    // Fetch HTML content
    const html = await fetchHtml(url);
    const ogData = extractOpenGraphTags(html);
    
    // Normalize image URL if present
    if (ogData.image) {
      ogData.image = normalizeImageUrl(ogData.image, url);
    } else {
      // Try to find a fallback image in the HTML
      const fallbackImage = extractFallbackImage(html, url);
      if (fallbackImage) {
        ogData.image = fallbackImage;
      }
    }
    
    // Build metadata based on platform
    const metadata: LinkMetadataItem['metadata'] = {
      type: 'link',
    };
    
    switch (platform) {
      case 'instagram':
        // Instagram posts/reels
        if (ogData.image) {
          metadata.thumbnail = ogData.image;
          metadata.type = 'image';
        }
        if (ogData.description) {
          metadata.description = ogData.description;
        }
        if (ogData.title) {
          metadata.title = ogData.title;
        }
        break;
        
      case 'bluesky':
        // Blue Sky quote posts
        if (ogData.description) {
          metadata.text = ogData.description;
          metadata.type = 'quote';
        }
        if (ogData.title) {
          metadata.title = ogData.title;
        }
        // Add image if available
        if (ogData.image) {
          metadata.thumbnail = ogData.image;
        }
        break;
        
      case 'threads':
        // Threads rethreads
        if (ogData.description) {
          metadata.text = ogData.description;
          metadata.type = 'rethread';
        }
        if (ogData.title) {
          metadata.title = ogData.title;
        }
        if (ogData.image) {
          metadata.thumbnail = ogData.image;
        }
        break;
        
      case 'mastodon':
        // Mastodon posts - always prioritize image display when available
        // Mastodon posts can have images, videos, or just text
        if (ogData.image) {
          metadata.thumbnail = ogData.image;
          // Always include image in metadata for Mastodon posts
        }
        if (ogData.description) {
          metadata.text = ogData.description;
          // Check if it's a repost/boost (common Mastodon patterns)
          const isRepost = ogData.description.toLowerCase().includes('boosted') || 
                         ogData.description.toLowerCase().includes('reposted') ||
                         ogData.title?.toLowerCase().includes('boosted') ||
                         ogData.title?.toLowerCase().includes('reposted');
          // Use 'repost' type to show Mastodon-specific styling
          // Images will be displayed prominently in the repost component
          metadata.type = 'repost';
        } else if (ogData.image) {
          // Has image but no description - show as image type
          metadata.type = 'image';
        } else {
          metadata.type = 'link';
        }
        if (ogData.title) {
          metadata.title = ogData.title;
        }
        break;
        
      default:
        // Generic link preview
        if (ogData.title) {
          metadata.title = ogData.title;
        }
        if (ogData.description) {
          metadata.description = ogData.description;
        }
        if (ogData.image) {
          metadata.thumbnail = ogData.image;
        }
        break;
    }
    
    return {
      url,
      platform,
      metadata: Object.keys(metadata).length > 1 ? metadata : undefined,
    };
  } catch (error) {
    console.error(`Failed to fetch metadata for ${url}:`, error);
    return null;
  }
}

/**
 * Fetches metadata for multiple links
 */
export async function fetchMultipleLinkMetadata(
  links: DetectedLink[]
): Promise<LinkMetadataItem[]> {
  const results = await Promise.allSettled(
    links.map(link => fetchLinkMetadata(link))
  );
  
  return results.map((result, index) => {
    const link = links[index];
    
    if (result.status === 'fulfilled' && result.value) {
      return {
        ...result.value,
        fetchStatus: 'success' as const,
        fetchedAt: new Date().toISOString(),
      };
    } else {
      return {
        url: link.url,
        platform: link.platform,
        fetchStatus: 'failed' as const,
      };
    }
  });
}
