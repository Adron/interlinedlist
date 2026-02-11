import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { put } from '@vercel/blob';
import { resizeAvatarToLimit, getMaxSizeBytes } from '@/lib/avatar/resize';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 1.4 * 1024 * 1024; // 1.4 MB

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File must be 1.4 MB or smaller (got ${(file.size / 1024 / 1024).toFixed(2)} MB)` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
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
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
