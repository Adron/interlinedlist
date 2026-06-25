import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserOrSyncToken } from '@/lib/auth/sync-token';
import { put } from '@vercel/blob';
import { resizeAvatarToLimit, getMaxSizeBytes } from '@/lib/avatar/resize';
import { safeFetch, SsrfError } from '@/lib/security/ssrf';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // SSRF-safe fetch: validates the host (and every redirect hop) against the
    // private/loopback/link-local blocklist before connecting.
    let response: Response;
    try {
      response = await safeFetch(url, {
        headers: { 'User-Agent': 'InterlinedList-Avatar-Fetch/1.0' },
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      if (err instanceof SsrfError) {
        return NextResponse.json({ error: 'URL is not allowed' }, { status: 400 });
      }
      throw err;
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image (${response.status})` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL did not return an image' }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    if (buffer.length > getMaxSizeBytes()) {
      const resized = await resizeAvatarToLimit(buffer, contentType);
      buffer = Buffer.from(resized.buffer);
    }

    const pathname = `avatars/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error) {
    console.error('Avatar from-url error:', error);
    return NextResponse.json(
      { error: 'Failed to save avatar from URL' },
      { status: 500 }
    );
  }
}
