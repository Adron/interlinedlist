import { NextRequest, NextResponse } from 'next/server';
import { getOAuthAuthorizationUrl } from '@/lib/auth/oauth/providers';

/**
 * Initiate OAuth flow - redirect to provider
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  const provider = providerParam as
    | 'google'
    | 'github'
    | 'mastodon'
    | 'bluesky';

  const authUrl = getOAuthAuthorizationUrl(provider);

  if (!authUrl) {
    return NextResponse.json(
      { error: 'OAuth provider not configured' },
      { status: 400 }
    );
  }

  return NextResponse.redirect(authUrl);
}
