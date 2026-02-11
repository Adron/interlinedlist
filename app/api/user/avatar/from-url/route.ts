import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { put } from '@vercel/blob';
import { resizeAvatarToLimit, getMaxSizeBytes } from '@/lib/avatar/resize';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'URL must be http or https' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'InterlinedList-Avatar-Fetch/1.0' },
      signal: AbortSignal.timeout(15000),
    });
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
      buffer = resized.buffer;
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
