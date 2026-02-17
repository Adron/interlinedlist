import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';

const MAX_VIDEO_BYTES = 3 * 1024 * 1024; // 3 MB

const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Email verification required to post videos.' },
        { status: 403 }
      );
    }
    if (!user.cleared) {
      return NextResponse.json(
        { error: 'Your account is pending approval. Contact an administrator.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const contentType = file.type;
    const ext = ALLOWED_VIDEO_TYPES[contentType];
    if (!ext) {
      return NextResponse.json(
        { error: 'File must be a video (MP4, WebM, QuickTime, or AVI)' },
        { status: 400 }
      );
    }

    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        {
          error: `Video must be 3 MB or smaller (got ${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pathname = `messages/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType,
    });

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error) {
    console.error('Message video upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}
