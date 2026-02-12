import { NextRequest, NextResponse } from 'next/server';
import {
  registerMastodonApp,
  buildMastodonAuthUrl,
  generateState,
  mastodonProvider,
} from '@/lib/auth/oauth-mastodon';
import { setOAuthStateCookie } from '@/lib/auth/oauth-state';
import { APP_URL } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

function normalizeInstance(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const instanceRaw = searchParams.get('instance');
  const link = searchParams.get('link') === 'true';

  if (!instanceRaw) {
    return NextResponse.redirect(
      `${APP_URL}/login?error=${encodeURIComponent('Instance domain is required')}`
    );
  }

  const instance = normalizeInstance(instanceRaw);
  if (!instance) {
    return NextResponse.redirect(
      `${APP_URL}/login?error=${encodeURIComponent('Invalid instance domain')}`
    );
  }

  try {
    const { clientId, clientSecret } = await registerMastodonApp(instance);
    const state = generateState();

    await setOAuthStateCookie({
      state,
      codeVerifier: '', // Mastodon doesn't use PKCE
      link,
      provider: mastodonProvider(instance),
      instance,
    });

    // Store client credentials in cookie for callback (they're needed for token exchange)
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set('oauth_mastodon_creds', JSON.stringify({
      instance,
      clientId,
      clientSecret,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    const authUrl = buildMastodonAuthUrl(instance, clientId, state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Mastodon authorize error:', error);
    const message = error instanceof Error ? error.message : 'Mastodon authorization failed';
    const redirectUrl = link ? '/settings' : '/login';
    return NextResponse.redirect(
      `${APP_URL}${redirectUrl}?error=${encodeURIComponent(message)}`
    );
  }
}
