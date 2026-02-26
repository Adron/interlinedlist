import { NextRequest, NextResponse } from 'next/server';
import {
  buildGitHubAuthUrl,
  generatePKCE,
  generateState,
  GITHUB_PROVIDER,
} from '@/lib/auth/oauth-github';
import { setOAuthStateCookie } from '@/lib/auth/oauth-state';
import { APP_URL } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const link = searchParams.get('link') === 'true';

    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = generateState();

    await setOAuthStateCookie({
      state,
      codeVerifier,
      link,
      provider: GITHUB_PROVIDER,
    });

    const authUrl = buildGitHubAuthUrl(state, codeChallenge, link);
    return NextResponse.redirect(authUrl);
  } catch (error: unknown) {
    console.error('GitHub authorize error:', error);
    const message = error instanceof Error ? error.message : 'OAuth configuration error';
    const redirectUrl = `${APP_URL}/login?error=${encodeURIComponent(message)}`;
    return NextResponse.redirect(redirectUrl);
  }
}
