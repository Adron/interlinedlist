import { NextRequest, NextResponse } from 'next/server';
import { APP_URL } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

/**
 * Bluesky OAuth callback.
 * Placeholder - full implementation requires persisting state/session stores
 * and integrating with User/LinkedIdentity creation.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const clientId = process.env.BLUESKY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      `${APP_URL}/login?error=${encodeURIComponent('Bluesky OAuth not configured')}`
    );
  }

  try {
    const { NodeOAuthClient, OAuthClient } = await import('@atproto/oauth-client-node');
    const { blueskyStateStore, blueskySessionStore } = await import('@/lib/auth/oauth-bluesky-stores');

    const metadata = await OAuthClient.fetchMetadata({
      clientId: clientId as `https://${string}/${string}`,
    });

    const client = new NodeOAuthClient({
      clientMetadata: metadata,
      stateStore: blueskyStateStore,
      sessionStore: blueskySessionStore,
    });

    const params = new URLSearchParams(searchParams);
    const { session, state } = await client.callback(params);

    const stateData = JSON.parse(state || '{}');
    const link = stateData.link === true;

    const did = session.did;
    const handle = did;

    const { prisma } = await import('@/lib/prisma');
    const { hashPassword } = await import('@/lib/auth/password');
    const { getCurrentUser } = await import('@/lib/auth/session');
    const { ensureUserInPublicOrganization } = await import('@/lib/organizations/queries');
    const { randomBytes } = await import('crypto');

    const provider = 'bluesky';
    const providerUserId = did;

    const existingLink = await prisma.linkedIdentity.findFirst({
      where: { provider, providerUserId },
      include: { user: true },
    });

    const providerData = {
      did,
      handle,
    };

    if (link) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.redirect(`${APP_URL}/login?error=Must be logged in to link`);
      }
      if (existingLink && existingLink.userId !== user.id) {
        return NextResponse.redirect(`${APP_URL}/settings?error=Bluesky account already linked`);
      }
      if (existingLink && existingLink.userId === user.id) {
        await prisma.linkedIdentity.update({
          where: { id: existingLink.id },
          data: {
            providerUsername: handle,
            providerData: providerData as object,
            profileUrl: `https://bsky.app/profile/${handle}`,
          },
        });
      } else {
        await prisma.linkedIdentity.create({
          data: {
            userId: user.id,
            provider,
            providerUserId,
            providerUsername: handle,
            providerData: providerData as object,
            profileUrl: `https://bsky.app/profile/${handle}`,
          },
        });
      }
      return NextResponse.redirect(`${APP_URL}/settings?success=Bluesky+linked`);
    }

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

    const email = `${handle.replace(/[^a-zA-Z0-9]/g, '_')}@users.bsky.app`;
    const usernameBase = handle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    let username = usernameBase;
    let suffix = 0;
    while (await prisma.user.findUnique({ where: { username } })) {
      suffix++;
      username = `${usernameBase}_${suffix}`;
    }

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: await hashPassword(`oauth_${randomBytes(32).toString('hex')}`),
        displayName: handle,
      },
    });

    await ensureUserInPublicOrganization(user.id);

    await prisma.linkedIdentity.create({
      data: {
        userId: user.id,
        provider,
        providerUserId,
        providerUsername: handle,
        providerData: providerData as object,
        profileUrl: `https://bsky.app/profile/${handle}`,
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
    console.error('Bluesky callback error:', error);
    return NextResponse.redirect(
      `${APP_URL}/login?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Bluesky sign-in failed'
      )}`
    );
  }
}
