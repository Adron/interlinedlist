import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/images/proxy?url={imageUrl}
 * Proxy endpoint for fetching images (primarily Instagram) server-side
 * to bypass CORS restrictions
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
        return NextResponse.json(
          { error: 'URL does not point to an image' },
          { status: 400 }
        );
      }
      
      // Get image data
      const imageBuffer = await response.arrayBuffer();
      
      // Limit response size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (imageBuffer.byteLength > maxSize) {
        return NextResponse.json(
          { error: 'Image too large' },
          { status: 413 }
        );
      }
      
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
      
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 504 }
        );
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}
