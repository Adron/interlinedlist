import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isSubscriber } from '@/lib/subscription/is-subscriber';
import { put } from '@vercel/blob';
import { resizeAvatarToLimit, ImageTooLargeAfterResizeError } from '@/lib/avatar/resize';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Email verification required to post images.' },
        { status: 403 }
      );
    }
    if (!isSubscriber(user.customerStatus)) {
      return NextResponse.json(
        { error: 'Subscribe to unlock image posting.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const contentType = file.type;
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Resize to at most 1200px per side and 1.4MB (proportions maintained)
    let resizedBuffer: Buffer;
    try {
      const result = await resizeAvatarToLimit(buffer, contentType);
      resizedBuffer = result.buffer;
    } catch (err) {
      if (err instanceof ImageTooLargeAfterResizeError) {
        return NextResponse.json(
          {
            error:
              'Image could not be resized to fit the limit. Please manually resize to under 1200×1200 pixels and 1.4 MB.',
          },
          { status: 413 }
        );
      }
      throw err;
    }

    const pathname = `messages/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const blob = await put(pathname, resizedBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error) {
    console.error('Message image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
