import { NextRequest, NextResponse } from 'next/server';
import {
  buildTwitterAuthUrl,
  generateState,
  TWITTER_PROVIDER,
} from '@/lib/auth/oauth-twitter';
import { generateCodeVerifier, generateCodeChallenge, isAllowedRedirectUri } from '@/lib/auth/pkce';
import { setOAuthStateCookie } from '@/lib/auth/oauth-state';
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
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    await setOAuthStateCookie({
      state,
      codeVerifier,
      link,
      provider: TWITTER_PROVIDER,
      redirectUri,
    });

    const authUrl = buildTwitterAuthUrl(state, codeChallenge);
    return NextResponse.redirect(authUrl);
  } catch (error: unknown) {
    console.error('Twitter authorize error:', error);
    const message = error instanceof Error ? error.message : 'OAuth configuration error';
    return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent(message)}`);
  }
}
