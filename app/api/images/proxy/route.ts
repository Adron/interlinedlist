import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_ENTRIES = 50;

interface CacheEntry {
  buffer: ArrayBuffer;
  contentType: string;
  expiresAt: number;
}

const imageCache = new Map<string, CacheEntry>();
const cacheKeysByAccess: string[] = [];

let placeholderBuffer: Buffer | null = null;

function getPlaceholderBuffer(): Buffer {
  if (placeholderBuffer) return placeholderBuffer;
  try {
    const path = join(process.cwd(), 'public', 'images', 'placeholder.svg');
    placeholderBuffer = readFileSync(path);
  } catch {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect fill="#e9ecef" width="400" height="200"/><text x="200" y="110" font-family="sans-serif" font-size="14" fill="#6c757d" text-anchor="middle">Image unavailable</text></svg>';
    placeholderBuffer = Buffer.from(svg, 'utf-8');
  }
  return placeholderBuffer;
}

const PLACEHOLDER_CONTENT_TYPE = 'image/svg+xml';

function getCached(imageUrl: string): CacheEntry | null {
  const entry = imageCache.get(imageUrl);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) imageCache.delete(imageUrl);
    return null;
  }
  // Move to end for LRU
  const idx = cacheKeysByAccess.indexOf(imageUrl);
  if (idx >= 0) cacheKeysByAccess.splice(idx, 1);
  cacheKeysByAccess.push(imageUrl);
  return entry;
}

function setCache(imageUrl: string, buffer: ArrayBuffer, contentType: string): void {
  while (imageCache.size >= MAX_CACHE_ENTRIES && cacheKeysByAccess.length > 0) {
    const oldest = cacheKeysByAccess.shift();
    if (oldest) imageCache.delete(oldest);
  }
  cacheKeysByAccess.push(imageUrl);
  imageCache.set(imageUrl, {
    buffer,
    contentType,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function respondWithPlaceholder(): NextResponse {
  const buf = getPlaceholderBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': PLACEHOLDER_CONTENT_TYPE,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'X-Image-Status': 'placeholder',
    },
  });
}

/**
 * GET /api/images/proxy?url={imageUrl}
 * Proxy endpoint for fetching images (primarily Instagram) server-side
 * to bypass CORS restrictions. Returns placeholder on fetch failure.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    // Validate URL parameter
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Only allow Instagram domains for security
    const allowedDomains = [
      'instagram.com',
      'cdninstagram.com',
      'fbcdn.net',
    ];

    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowed = allowedDomains.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Only Instagram image URLs are allowed' },
        { status: 403 }
      );
    }

    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Invalid protocol' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = getCached(imageUrl);
    if (cached) {
      return new NextResponse(cached.buffer, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // Fetch image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; InterlinedList/1.0; +https://interlinedlist.com)',
          'Accept': 'image/*',
          'Referer': 'https://www.instagram.com/',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Check content type
      const contentType = response.headers.get('Content-Type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) {
        return respondWithPlaceholder();
      }

      // Get image data
      const imageBuffer = await response.arrayBuffer();

      // Limit response size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (imageBuffer.byteLength > maxSize) {
        return respondWithPlaceholder();
      }

      // Cache successful fetch
      setCache(imageUrl, imageBuffer, contentType);

      // Return image with proper headers
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return respondWithPlaceholder();
        }
        // Log at debug level; we're returning placeholder gracefully
        if (process.env.NODE_ENV === 'development') {
          console.warn('Image proxy fallback:', error.message);
        }
      }

      return respondWithPlaceholder();
    }
  } catch (error) {
    console.error('Image proxy error:', error);
    return respondWithPlaceholder();
  }
}
