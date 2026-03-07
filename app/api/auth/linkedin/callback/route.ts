import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import {
  exchangeLinkedInCode,
  fetchLinkedInUser,
  getLinkedInRedirectUri,
  LINKEDIN_PROVIDER,
} from '@/lib/auth/oauth-linkedin';
import { getOAuthStateCookie, deleteOAuthStateCookie } from '@/lib/auth/oauth-state';
import { getCurrentUser } from '@/lib/auth/session';
import { ensureUserInPublicOrganization } from '@/lib/organizations/queries';
import { trackAction } from '@/lib/analytics/track';
import { APP_URL } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

function redirectToLogin(error: string) {
  return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent(error)}`);
}

function redirectToSettings(error?: string) {
  const url = new URL(`${APP_URL}/settings`);
  if (error) url.searchParams.set('error', error);
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

  if (!oauthState || oauthState.state !== state || oauthState.provider !== LINKEDIN_PROVIDER) {
    return redirectToLogin('Invalid state');
  }

  try {
    const redirectUri = getLinkedInRedirectUri();
    const tokens = await exchangeLinkedInCode(code, redirectUri);
    const linkedInUser = await fetchLinkedInUser(tokens.access_token);

    const providerUserId = linkedInUser.sub;
    const provider = LINKEDIN_PROVIDER;
    const providerUsername = linkedInUser.name || linkedInUser.given_name || linkedInUser.email || 'LinkedIn user';
    // LinkedIn userinfo does not return vanity name; profile URL requires separate API call
    const profileUrl: string | null = null;
    const providerData = {
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    } as object;

    const existingLink = await prisma.linkedIdentity.findFirst({
      where: {
        provider,
        providerUserId,
      },
      include: { user: true },
    });

    if (oauthState.link) {
      const user = await getCurrentUser();
      if (!user) {
        return redirectToLogin('You must be logged in to link accounts');
      }
      if (existingLink && existingLink.userId !== user.id) {
        return redirectToSettings('This LinkedIn account is already linked to another user');
      }

      if (existingLink && existingLink.userId === user.id) {
        await prisma.linkedIdentity.update({
          where: { id: existingLink.id },
          data: {
            providerUsername,
            providerData,
            profileUrl,
            avatarUrl: linkedInUser.picture ?? null,
            lastVerifiedAt: new Date(),
          },
        });
      } else {
        await prisma.linkedIdentity.create({
          data: {
            userId: user.id,
            provider,
            providerUserId,
            providerUsername,
            providerData,
            profileUrl,
            avatarUrl: linkedInUser.picture ?? null,
          },
        });
      }
      trackAction('oauth_connect', { userId: user.id, properties: { provider: 'linkedin' } }).catch(() => {});
      return redirectToSettings('LinkedIn account linked successfully');
    }

    if (existingLink) {
      await prisma.linkedIdentity.update({
        where: { id: existingLink.id },
        data: {
          providerData,
          providerUsername,
          profileUrl,
          avatarUrl: linkedInUser.picture ?? null,
          lastVerifiedAt: new Date(),
        },
      });
      const response = NextResponse.redirect(`${APP_URL}/dashboard`);
      response.cookies.set('session', existingLink.userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return response;
    }

    const email = linkedInUser.email || `${providerUserId}+linkedin@users.noreply.linkedin.com`;
    const usernameBase = (linkedInUser.name || providerUserId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    let username = usernameBase;
    let suffix = 0;
    while (await prisma.user.findUnique({ where: { username } })) {
      suffix++;
      username = `${usernameBase}_${suffix}`;
    }

    const passwordHash = await hashPassword(
      `oauth_${randomBytes(32).toString('hex')}`
    );

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName: linkedInUser.name || linkedInUser.given_name || username,
        avatar: linkedInUser.picture ?? null,
        emailVerified: !!linkedInUser.email,
      },
    });

    try {
      await ensureUserInPublicOrganization(user.id);
    } catch {
      // Non-fatal
    }

    await prisma.linkedIdentity.create({
      data: {
        userId: user.id,
        provider,
        providerUserId,
        providerUsername,
        providerData,
        profileUrl,
        avatarUrl: linkedInUser.picture ?? null,
      },
    });

    trackAction('oauth_connect', { userId: user.id, properties: { provider: 'linkedin' } }).catch(() => {});

    const response = NextResponse.redirect(`${APP_URL}/dashboard`);
    response.cookies.set('session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    return redirectToLogin(
      error instanceof Error ? error.message : 'Failed to complete sign in'
    );
  }
}
