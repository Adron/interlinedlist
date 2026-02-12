import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import {
  exchangeMastodonCode,
  fetchMastodonAccount,
  mastodonProvider,
} from '@/lib/auth/oauth-mastodon';
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

  if (!oauthState || oauthState.state !== state || !oauthState.provider.startsWith('mastodon:')) {
    return redirectToLogin('Invalid state');
  }

  const instance = oauthState.instance || oauthState.provider.replace('mastodon:', '');
  if (!instance) {
    return redirectToLogin('Missing instance');
  }

  const cookieStore = await cookies();
  const credsRaw = cookieStore.get('oauth_mastodon_creds')?.value;
  cookieStore.delete('oauth_mastodon_creds');

  if (!credsRaw) {
    return redirectToLogin('Session expired - please try again');
  }

  let creds: { instance: string; clientId: string; clientSecret: string };
  try {
    creds = JSON.parse(credsRaw);
  } catch {
    return redirectToLogin('Invalid session');
  }

  if (creds.instance !== instance) {
    return redirectToLogin('Instance mismatch');
  }

  try {
    const tokens = await exchangeMastodonCode(
      instance,
      code,
      creds.clientId,
      creds.clientSecret
    );
    const account = await fetchMastodonAccount(instance, tokens.access_token);

    const provider = mastodonProvider(instance);
    const providerUserId = account.id;

    const existingLink = await prisma.linkedIdentity.findFirst({
      where: {
        provider,
        providerUserId,
      },
      include: { user: true },
    });

    const providerData = {
      access_token: tokens.access_token,
      instance_url: `https://${instance}`,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    };

    if (oauthState.link) {
      const user = await getCurrentUser();
      if (!user) {
        return redirectToLogin('You must be logged in to link accounts');
      }
      if (existingLink && existingLink.userId !== user.id) {
        return redirectToSettings('This Mastodon account is already linked to another user');
      }
      if (existingLink && existingLink.userId === user.id) {
        await prisma.linkedIdentity.update({
          where: { id: existingLink.id },
          data: {
            providerUsername: `${account.username}@${instance}`,
            providerData: providerData as object,
            profileUrl: account.url,
            avatarUrl: account.avatar,
          },
        });
      } else {
        await prisma.linkedIdentity.create({
          data: {
            userId: user.id,
            provider,
            providerUserId,
            providerUsername: `${account.username}@${instance}`,
            providerData: providerData as object,
            profileUrl: account.url,
            avatarUrl: account.avatar,
          },
        });
      }
      return redirectToSettings('Mastodon account linked successfully');
    }

    // Sign-in flow
    if (existingLink) {
      await prisma.linkedIdentity.update({
        where: { id: existingLink.id },
        data: {
          providerData: providerData as object,
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

    // New user
    const email = `${account.username}+${instance.replace(/\./g, '_')}@users.noreply.mastodon`;
    const usernameBase = `${account.username}_${instance.split('.')[0]}`.replace(/[^a-zA-Z0-9_-]/g, '_');
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
        displayName: account.display_name || account.username,
        avatar: account.avatar,
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
        providerUsername: `${account.username}@${instance}`,
        providerData: providerData as object,
        profileUrl: account.url,
        avatarUrl: account.avatar,
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
    console.error('Mastodon callback error:', error);
    return redirectToLogin(
      error instanceof Error ? error.message : 'Failed to complete sign in'
    );
  }
}
