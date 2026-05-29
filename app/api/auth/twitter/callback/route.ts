import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import {
  exchangeTwitterCode,
  fetchTwitterUser,
  TWITTER_PROVIDER,
} from '@/lib/auth/oauth-twitter';
import { getOAuthStateCookie, deleteOAuthStateCookie } from '@/lib/auth/oauth-state';
import { getCurrentUser, createSession, getSessionCookieOptions } from '@/lib/auth/session';
import { createSyncTokenForUser } from '@/lib/auth/sync-token';
import { isMobileRedirectUri } from '@/lib/auth/pkce';
import { ensureUserInPublicOrganization } from '@/lib/organizations/queries';
import { trackAction } from '@/lib/analytics/track';
import { APP_URL, SESSION_COOKIE_NAME } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

function redirectToLogin(error: string) {
  return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent(error)}`);
}

async function buildSuccessResponse(userId: string, redirectUri?: string) {
  if (redirectUri && isMobileRedirectUri(redirectUri)) {
    const token = await createSyncTokenForUser(userId, 'Mobile-Twitter');
    const url = new URL(redirectUri);
    url.searchParams.set('token', token);
    return NextResponse.redirect(url.toString());
  }
  const response = NextResponse.redirect(`${APP_URL}/dashboard`);
  const cookieValue = await createSession(userId);
  response.cookies.set(SESSION_COOKIE_NAME, cookieValue, getSessionCookieOptions());
  return response;
}

function redirectToSettings(messageOrError?: string, isError = false) {
  const url = new URL(`${APP_URL}/integrations`);
  if (messageOrError) {
    url.searchParams.set(isError ? 'error' : 'success', messageOrError);
  }
  return NextResponse.redirect(url.toString());
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return redirectToLogin('Missing code or state');
  }

  const oauthState = await getOAuthStateCookie();
  await deleteOAuthStateCookie();

  if (!oauthState || oauthState.state !== state || oauthState.provider !== TWITTER_PROVIDER) {
    return redirectToLogin('Invalid state');
  }

  try {
    const tokens = await exchangeTwitterCode(code, oauthState.codeVerifier);
    const twitterUser = await fetchTwitterUser(tokens.access_token);

    const providerUserId = twitterUser.id;
    const provider = TWITTER_PROVIDER;
    const providerUsername = twitterUser.username;
    const profileUrl = `https://twitter.com/${twitterUser.username}`;
    const avatarUrl = twitterUser.profile_image_url
      ? twitterUser.profile_image_url.replace('_normal', '_400x400')
      : null;
    const providerData = {
      access_token: tokens.access_token,
      ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      ...(tokens.expires_in && { expires_at: Date.now() + tokens.expires_in * 1000 }),
    } as object;

    const existingLink = await prisma.linkedIdentity.findFirst({
      where: { provider, providerUserId },
      include: { user: true },
    });

    if (oauthState.link) {
      const user = await getCurrentUser();
      if (!user) {
        return redirectToLogin('You must be logged in to link accounts');
      }
      if (existingLink && existingLink.userId !== user.id) {
        return redirectToSettings('This Twitter account is already linked to another user', true);
      }

      if (existingLink && existingLink.userId === user.id) {
        await prisma.linkedIdentity.update({
          where: { id: existingLink.id },
          data: { providerUsername, providerData, profileUrl, avatarUrl, lastVerifiedAt: new Date() },
        });
      } else {
        await prisma.linkedIdentity.create({
          data: { userId: user.id, provider, providerUserId, providerUsername, providerData, profileUrl, avatarUrl },
        });
      }
      trackAction('oauth_connect', { userId: user.id, properties: { provider: 'twitter' } }).catch(() => {});
      return redirectToSettings('Twitter account linked successfully');
    }

    if (existingLink) {
      await prisma.linkedIdentity.update({
        where: { id: existingLink.id },
        data: { providerData, providerUsername, profileUrl, avatarUrl, lastVerifiedAt: new Date() },
      });
      return buildSuccessResponse(existingLink.userId, oauthState.redirectUri);
    }

    const email = `${providerUserId}+twitter@users.noreply.twitter.com`;
    const usernameBase = providerUsername.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    let username = usernameBase;
    let suffix = 0;
    while (await prisma.user.findUnique({ where: { username } })) {
      suffix++;
      username = `${usernameBase}_${suffix}`;
    }

    const passwordHash = await hashPassword(`oauth_${randomBytes(32).toString('hex')}`);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName: twitterUser.name || providerUsername,
        avatar: avatarUrl,
        emailVerified: false,
      },
    });

    try {
      await ensureUserInPublicOrganization(user.id);
    } catch {
      // Non-fatal
    }

    await prisma.linkedIdentity.create({
      data: { userId: user.id, provider, providerUserId, providerUsername, providerData, profileUrl, avatarUrl },
    });

    trackAction('oauth_connect', { userId: user.id, properties: { provider: 'twitter' } }).catch(() => {});

    return buildSuccessResponse(user.id, oauthState.redirectUri);
  } catch (error) {
    console.error('Twitter callback error:', error);
    return redirectToLogin(error instanceof Error ? error.message : 'Failed to complete sign in');
  }
}
