import { NextRequest, NextResponse } from 'next/server';
import {
  buildLinkedInAuthUrl,
  generateState,
  LINKEDIN_PROVIDER,
} from '@/lib/auth/oauth-linkedin';
import { setOAuthStateCookie } from '@/lib/auth/oauth-state';
import { isAllowedRedirectUri } from '@/lib/auth/pkce';
import { APP_URL } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const link = searchParams.get('link') === 'true';
    const redirectUri = searchParams.get('redirect_uri') ?? undefined;

    if (redirectUri && !isAllowedRedirectUri(redirectUri)) {
      return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent('Invalid redirect_uri')}`);
    }

    const state = generateState();

    await setOAuthStateCookie({
      state,
      codeVerifier: '',
      link,
      provider: LINKEDIN_PROVIDER,
      redirectUri,
    });

    const authUrl = buildLinkedInAuthUrl(state, link);
    return NextResponse.redirect(authUrl);
  } catch (error: unknown) {
    console.error('LinkedIn authorize error:', error);
    const message = error instanceof Error ? error.message : 'OAuth configuration error';
    const redirectUrl = `${APP_URL}/login?error=${encodeURIComponent(message)}`;
    return NextResponse.redirect(redirectUrl);
  }
}
