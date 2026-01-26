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
  text?: string; // Post content text
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
 * Decodes HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
  // Handle numeric entities (&#123; and &#x1F;)
  text = text.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Handle named entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&hellip;': '...',
    '&mdash;': '—',
    '&ndash;': '–',
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => {
    return entities[entity.toLowerCase()] || entity;
  });
}

/**
 * Extracts plain text from HTML content
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Replace common block elements with newlines
  text = text.replace(/<\/?(p|div|br|li|h[1-6])[^>]*>/gi, '\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = decodeHtmlEntities(text);
  
  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, '\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();
  
  return text;
}

/**
 * Extracts Open Graph meta tags from HTML
 */
function extractOpenGraphTags(html: string): OpenGraphData {
  const ogData: OpenGraphData = {};
  
  // Extract og:title (handle both property and name attributes, and different quote styles)
  // Also handle HTML entities in content
  const titlePatterns = [
    /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:title["']/i,
    /<meta\s+(?:property|name)=["']og:title["']\s+content=["]([^"]+)["]/i,
    /<meta\s+content=["]([^"]+)["]\s+(?:property|name)=["']og:title["']/i,
  ];
  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match) {
      ogData.title = decodeHtmlEntities(match[1]);
      break;
    }
  }
  
  // Extract og:description (post content) - handle HTML entities and different quote styles
  const descPatterns = [
    /<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:description["']/i,
    /<meta\s+(?:property|name)=["']og:description["']\s+content=["]([^"]+)["]/i,
    /<meta\s+content=["]([^"]+)["]\s+(?:property|name)=["']og:description["']/i,
  ];
  for (const pattern of descPatterns) {
    const match = html.match(pattern);
    if (match) {
      const decoded = decodeHtmlEntities(match[1]);
      ogData.description = decoded;
      ogData.text = decoded; // Also store as text for post content
      break;
    }
  }
  
  // Try to extract post content from other meta tags if og:description not found
  if (!ogData.text) {
    // Try twitter:description as fallback
    const twitterDescPatterns = [
      /<meta\s+(?:property|name)=["']twitter:description["']\s+content=["']([^"']+)["']/i,
      /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:description["']/i,
      /<meta\s+(?:property|name)=["']twitter:description["']\s+content=["]([^"]+)["]/i,
      /<meta\s+content=["]([^"]+)["]\s+(?:property|name)=["']twitter:description["']/i,
    ];
    for (const pattern of twitterDescPatterns) {
      const match = html.match(pattern);
      if (match) {
        const decoded = decodeHtmlEntities(match[1]);
        ogData.text = decoded;
        if (!ogData.description) {
          ogData.description = decoded;
        }
        break;
      }
    }
  }
  
  // Try to extract from article:content or other content meta tags
  if (!ogData.text) {
    const contentPatterns = [
      /<meta\s+(?:property|name)=["']article:content["']\s+content=["']([^"']+)["']/i,
      /<meta\s+property=["']og:article:content["']\s+content=["']([^"']+)["']/i,
      /<meta\s+(?:property|name)=["']article:content["']\s+content=["]([^"]+)["]/i,
      /<meta\s+property=["']og:article:content["']\s+content=["]([^"]+)["]/i,
    ];
    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match) {
        ogData.text = decodeHtmlEntities(match[1]);
        break;
      }
    }
  }
  
  // Extract og:image (try multiple variations)
  // Prioritize secure_url for Instagram, then regular og:image
  const imagePatterns = [
    // Try secure_url first (Instagram often uses this)
    /<meta\s+(?:property|name)=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image:secure_url["']/i,
    /<meta\s+(?:property|name)=["']og:image:secure_url["']\s+content=["]([^"]+)["]/i,
    /<meta\s+content=["]([^"]+)["]\s+(?:property|name)=["']og:image:secure_url["']/i,
    // Then try regular og:image
    /<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i,
    /<meta\s+(?:property|name)=["']og:image["']\s+content=["]([^"]+)["]/i,
    /<meta\s+content=["]([^"]+)["]\s+(?:property|name)=["']og:image["']/i,
    // Try og:image:url
    /<meta\s+(?:property|name)=["']og:image:url["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image:url["']/i,
    // Twitter Card images as fallback
    /<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:image["']/i,
    /<meta\s+(?:property|name)=["']twitter:image["']\s+content=["]([^"]+)["]/i,
    /<meta\s+content=["]([^"]+)["]\s+(?:property|name)=["']twitter:image["']/i,
  ];
  for (const pattern of imagePatterns) {
    const match = html.match(pattern);
    if (match) {
      const imageUrl = match[1];
      // Decode HTML entities in image URL (e.g., &amp; -> &)
      // Also decode URL encoding (%26 -> &)
      let decodedUrl = decodeHtmlEntities(imageUrl);
      // Decode URL-encoded entities as well
      try {
        decodedUrl = decodeURIComponent(decodedUrl);
      } catch {
        // If decodeURIComponent fails, use the HTML-decoded version
      }
      ogData.image = decodedUrl;
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
 * Also ensures HTML entities are decoded
 */
function normalizeImageUrl(imageUrl: string, baseUrl: string): string {
  try {
    // First decode any HTML entities (e.g., &amp; -> &)
    let decodedUrl = decodeHtmlEntities(imageUrl);
    
    // Try to decode URL encoding as well
    try {
      decodedUrl = decodeURIComponent(decodedUrl);
    } catch {
      // If decodeURIComponent fails, use the HTML-decoded version
    }
    
    // If already absolute, return decoded version
    if (decodedUrl.startsWith('http://') || decodedUrl.startsWith('https://')) {
      return decodedUrl;
    }
    // If protocol-relative (starts with //), add https:
    if (decodedUrl.startsWith('//')) {
      return `https:${decodedUrl}`;
    }
    // Otherwise, resolve relative to base URL
    const base = new URL(baseUrl);
    return new URL(decodedUrl, base).toString();
  } catch {
    // If URL parsing fails, return decoded original
    return decodeHtmlEntities(imageUrl);
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
 * Fetches JSON from a URL with timeout
 */
async function fetchJson(url: string, timeoutMs = 10000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InterlinedList/1.0; +https://interlinedlist.com)',
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Parses oEmbed HTML to extract text content
 */
function parseOEmbedHtml(html: string): string | null {
  // Extract text from blockquote (common in oEmbed responses)
  const blockquoteMatch = html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
  if (blockquoteMatch) {
    return extractTextFromHtml(blockquoteMatch[1]);
  }
  
  // Try to extract from any text content in the HTML
  const text = extractTextFromHtml(html);
  return text.length > 0 ? text : null;
}

/**
 * Fetches oEmbed metadata for Blue Sky
 */
async function fetchBlueskyOEmbed(url: string): Promise<Partial<OpenGraphData> | null> {
  try {
    const oembedUrl = `https://embed.bsky.app/oembed?url=${encodeURIComponent(url)}&maxwidth=600&format=json`;
    const data = await fetchJson(oembedUrl, 8000);
    
    const result: Partial<OpenGraphData> = {};
    
    // Extract text from HTML blockquote
    if (data.html) {
      const text = parseOEmbedHtml(data.html);
      if (text) {
        result.text = text;
        result.description = text;
      }
    }
    
    // Extract author name as title
    if (data.author_name) {
      result.title = data.author_name;
    }
    
    // Extract thumbnail if available
    if (data.thumbnail_url) {
      result.image = normalizeImageUrl(data.thumbnail_url, url);
    }
    
    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error(`Blue Sky oEmbed fetch failed for ${url}:`, error);
    return null;
  }
}

/**
 * Fetches oEmbed metadata for Mastodon
 */
async function fetchMastodonOEmbed(url: string): Promise<Partial<OpenGraphData> | null> {
  try {
    // Extract instance URL from Mastodon status URL
    const urlObj = new URL(url);
    const instanceUrl = `${urlObj.protocol}//${urlObj.host}`;
    const oembedUrl = `${instanceUrl}/api/oembed?url=${encodeURIComponent(url)}`;
    
    const data = await fetchJson(oembedUrl, 8000);
    
    const result: Partial<OpenGraphData> = {};
    
    // Extract text from HTML (may contain iframe, try to parse)
    if (data.html) {
      const text = parseOEmbedHtml(data.html);
      if (text) {
        result.text = text;
        result.description = text;
      }
    }
    
    // Extract author name
    if (data.author_name) {
      result.title = data.author_name;
    }
    
    // Extract thumbnail if available
    if (data.thumbnail_url) {
      result.image = normalizeImageUrl(data.thumbnail_url, url);
    }
    
    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error(`Mastodon oEmbed fetch failed for ${url}:`, error);
    return null;
  }
}

/**
 * Fetches Mastodon status JSON data
 */
async function fetchMastodonJson(url: string): Promise<Partial<OpenGraphData> | null> {
  try {
    // Construct JSON URL - Mastodon status URLs can be:
    // https://instance.com/@user/123456
    // https://instance.com/@user/status/123456
    // We need to append .json before any query params or fragments
    let jsonUrl: string;
    if (url.endsWith('.json')) {
      jsonUrl = url;
    } else {
      // Remove query params and fragments, then append .json
      const urlObj = new URL(url);
      urlObj.search = '';
      urlObj.hash = '';
      jsonUrl = `${urlObj.toString()}.json`;
    }
    
    const data = await fetchJson(jsonUrl, 8000);
    
    const result: Partial<OpenGraphData> = {};
    
    // Extract content (HTML format)
    if (data.content) {
      const text = extractTextFromHtml(data.content);
      if (text) {
        result.text = text;
        result.description = text;
      }
    }
    
    // Extract author information
    if (data.account) {
      const authorName = data.account.display_name || data.account.username;
      if (authorName) {
        result.title = authorName;
      }
    }
    
    // Extract first image from media attachments
    if (data.media_attachments && Array.isArray(data.media_attachments) && data.media_attachments.length > 0) {
      const firstMedia = data.media_attachments[0];
      const imageUrl = firstMedia.preview_url || firstMedia.url;
      if (imageUrl) {
        result.image = normalizeImageUrl(imageUrl, url);
      }
    }
    
    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error(`Mastodon JSON fetch failed for ${url}:`, error);
    return null;
  }
}

/**
 * Merges multiple OpenGraphData objects, prioritizing non-empty values
 */
function mergeOpenGraphData(...dataSources: (Partial<OpenGraphData> | null)[]): OpenGraphData {
  const merged: OpenGraphData = {};
  
  for (const data of dataSources) {
    if (!data) continue;
    
    // Merge text (prioritize first non-empty)
    if (data.text && !merged.text) {
      merged.text = data.text;
    }
    
    // Merge description (prioritize first non-empty)
    if (data.description && !merged.description) {
      merged.description = data.description;
    }
    
    // Merge title (prioritize first non-empty)
    if (data.title && !merged.title) {
      merged.title = data.title;
    }
    
    // Merge image (prioritize first non-empty)
    if (data.image && !merged.image) {
      merged.image = data.image;
    }
    
    // Merge type (prioritize first non-empty)
    if (data.type && !merged.type) {
      merged.type = data.type;
    }
  }
  
  return merged;
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
  
  const dataSources: (Partial<OpenGraphData> | null)[] = [];
  
  try {
    // Primary: Try Open Graph extraction
    try {
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
      
      dataSources.push(ogData);
    } catch (error) {
      console.error(`Open Graph fetch failed for ${url}:`, error);
    }
    
    // Fallback: Try platform-specific APIs
    if (platform === 'bluesky') {
      try {
        const oembedData = await fetchBlueskyOEmbed(url);
        if (oembedData) {
          dataSources.push(oembedData);
        }
      } catch (error) {
        console.error(`Blue Sky oEmbed fetch failed for ${url}:`, error);
      }
    } else if (platform === 'mastodon') {
      // Try oEmbed first
      try {
        const oembedData = await fetchMastodonOEmbed(url);
        if (oembedData) {
          dataSources.push(oembedData);
        }
      } catch (error) {
        console.error(`Mastodon oEmbed fetch failed for ${url}:`, error);
      }
      
      // Then try JSON endpoint
      try {
        const jsonData = await fetchMastodonJson(url);
        if (jsonData) {
          dataSources.push(jsonData);
        }
      } catch (error) {
        console.error(`Mastodon JSON fetch failed for ${url}:`, error);
      }
    }
    
    // Merge all data sources
    const ogData = mergeOpenGraphData(...dataSources);
    
    // If we have no data at all, return null
    if (Object.keys(ogData).length === 0) {
      return null;
    }
    
    // Build metadata based on platform
    const metadata: LinkMetadataItem['metadata'] = {
      type: 'link',
    };
    
    switch (platform) {
      case 'instagram':
        // Instagram posts/reels
        // Instagram often uses og:image:secure_url or multiple image tags
        // Try to get the best quality image available
        if (ogData.image) {
          // Normalize Instagram image URLs - they may be relative or need protocol
          // normalizeImageUrl handles HTML entity decoding
          const normalizedImage = normalizeImageUrl(ogData.image, url);
          metadata.thumbnail = normalizedImage;
          metadata.type = 'image';
        }
        
        // Try to extract description/caption
        if (ogData.description) {
          metadata.description = ogData.description;
          // Instagram descriptions are often the post caption
          metadata.text = ogData.description;
        } else if (ogData.text) {
          metadata.description = ogData.text;
          metadata.text = ogData.text;
        }
        
        // Extract title (usually the username or post title)
        if (ogData.title) {
          metadata.title = ogData.title;
        }
        
        // Log for debugging if no image found
        if (!metadata.thumbnail) {
          console.warn(`Instagram metadata missing image for ${url}`);
        }
        break;
        
      case 'bluesky':
        // Blue Sky quote posts - prioritize post content
        // Use text field if available, otherwise fall back to description
        if (ogData.text) {
          metadata.text = ogData.text;
        } else if (ogData.description) {
          metadata.text = ogData.description;
        }
        if (metadata.text) {
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
        // Threads rethreads - prioritize post content
        // Use text field if available, otherwise fall back to description
        if (ogData.text) {
          metadata.text = ogData.text;
        } else if (ogData.description) {
          metadata.text = ogData.description;
        }
        if (metadata.text) {
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
        // Mastodon posts - always prioritize post content and image display
        // Mastodon posts can have images, videos, or just text
        if (ogData.image) {
          metadata.thumbnail = ogData.image;
          // Always include image in metadata for Mastodon posts
        }
        // Prioritize post content - use text field if available, otherwise description
        if (ogData.text) {
          metadata.text = ogData.text;
        } else if (ogData.description) {
          metadata.text = ogData.description;
        }
        if (metadata.text) {
          // Check if it's a repost/boost (common Mastodon patterns)
          const isRepost = metadata.text.toLowerCase().includes('boosted') || 
                         metadata.text.toLowerCase().includes('reposted') ||
                         ogData.title?.toLowerCase().includes('boosted') ||
                         ogData.title?.toLowerCase().includes('reposted');
          // Use 'repost' type to show Mastodon-specific styling
          // Images will be displayed prominently in the repost component
          metadata.type = 'repost';
        } else if (ogData.image) {
          // Has image but no text - show as image type
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
    
    // Return metadata even if minimal (at least we have something)
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
      // Consider it successful if we have any metadata
      const hasMetadata = result.value.metadata && 
        (result.value.metadata.text || 
         result.value.metadata.thumbnail || 
         result.value.metadata.title || 
         result.value.metadata.description);
      
      return {
        ...result.value,
        fetchStatus: hasMetadata ? 'success' as const : 'failed' as const,
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
