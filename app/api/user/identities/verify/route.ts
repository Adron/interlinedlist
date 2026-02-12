import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const provider = body.provider as string | undefined;
  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 });
  }

  const identity = await prisma.linkedIdentity.findFirst({
    where: {
      userId: user.id,
      provider,
    },
  });

  if (!identity) {
    return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
  }

  const providerData = identity.providerData as Record<string, unknown> | null;
  const accessToken = providerData?.access_token;
  if (!accessToken || typeof accessToken !== 'string') {
    return NextResponse.json({ error: 'No token to verify' }, { status: 400 });
  }

  try {
    if (identity.provider === 'github') {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!res.ok) throw new Error('Token invalid');
    } else if (identity.provider.startsWith('mastodon:')) {
      const instance = identity.provider.replace('mastodon:', '');
      const instanceUrl = (providerData?.instance_url as string) || `https://${instance}`;
      const res = await fetch(`${instanceUrl}/api/v1/accounts/verify_credentials`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) throw new Error('Token invalid');
    } else if (identity.provider === 'bluesky') {
      // Bluesky: verify via AT Protocol - would need proper API call
      // For now, just update lastVerifiedAt if we have a token
      // TODO: implement proper Bluesky verification
    }

    await prisma.linkedIdentity.update({
      where: { id: identity.id },
      data: { lastVerifiedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify identity error:', error);
    return NextResponse.json(
      { error: 'Verification failed - token may be expired' },
      { status: 400 }
    );
  }
}
