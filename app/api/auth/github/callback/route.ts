import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import {
  exchangeGitHubCode,
  fetchGitHubUser,
  GITHUB_PROVIDER,
} from '@/lib/auth/oauth-github';
import { getOAuthStateCookie, deleteOAuthStateCookie } from '@/lib/auth/oauth-state';
import { getCurrentUser } from '@/lib/auth/session';
import { ensureUserInPublicOrganization } from '@/lib/organizations/queries';
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

  if (!oauthState || oauthState.state !== state || oauthState.provider !== GITHUB_PROVIDER) {
    return redirectToLogin('Invalid state');
  }

  try {
    const tokens = await exchangeGitHubCode(code, oauthState.codeVerifier);
    const ghUser = await fetchGitHubUser(tokens.access_token);

    const providerUserId = String(ghUser.id);
    const provider = GITHUB_PROVIDER;

    // Check if this GitHub account is already linked
    const existingLink = await prisma.linkedIdentity.findFirst({
      where: {
        provider,
        providerUserId,
      },
      include: { user: true },
    });

    if (oauthState.link) {
      // Linking from Settings - user must be logged in
      const user = await getCurrentUser();
      if (!user) {
        return redirectToLogin('You must be logged in to link accounts');
      }
      if (existingLink && existingLink.userId !== user.id) {
        return redirectToSettings('This GitHub account is already linked to another user');
      }
      const providerData = {
        access_token: tokens.access_token,
        scopes: tokens.scope ?? '',
      } as object;

      if (existingLink && existingLink.userId === user.id) {
        // Already linked, just update
        await prisma.linkedIdentity.update({
          where: { id: existingLink.id },
          data: {
            providerUsername: ghUser.login,
            providerData,
            profileUrl: ghUser.html_url,
            avatarUrl: ghUser.avatar_url,
          },
        });
      } else {
        await prisma.linkedIdentity.create({
          data: {
            userId: user.id,
            provider,
            providerUserId,
            providerUsername: ghUser.login,
            providerData,
            profileUrl: ghUser.html_url,
            avatarUrl: ghUser.avatar_url,
          },
        });
      }
      return redirectToSettings('GitHub account linked successfully');
    }

    // Sign-in flow - only update lastVerifiedAt; preserve existing token/scopes
    // (sign-in uses minimal scope; overwriting would downgrade repo access)
    if (existingLink) {
      await prisma.linkedIdentity.update({
        where: { id: existingLink.id },
        data: {
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

    // New user - create account
    const email = ghUser.email || `${ghUser.login}+github@users.noreply.github.com`;
    const usernameBase = ghUser.login.replace(/[^a-zA-Z0-9_-]/g, '_');
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
        displayName: ghUser.name || ghUser.login,
        avatar: ghUser.avatar_url,
        emailVerified: !!ghUser.email,
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
        providerUsername: ghUser.login,
        providerData: {
          access_token: tokens.access_token,
          scopes: tokens.scope ?? '',
        } as object,
        profileUrl: ghUser.html_url,
        avatarUrl: ghUser.avatar_url,
      },
    });

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
    console.error('GitHub callback error:', error);
    return redirectToLogin(
      error instanceof Error ? error.message : 'Failed to complete sign in'
    );
  }
}
