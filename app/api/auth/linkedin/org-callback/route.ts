import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  exchangeLinkedInCode,
  fetchLinkedInUser,
  fetchLinkedInAdminPages,
  getLinkedInOrgRedirectUri,
  LINKEDIN_PROVIDER,
} from '@/lib/auth/oauth-linkedin';
import { getOAuthStateCookie, deleteOAuthStateCookie } from '@/lib/auth/oauth-state';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization, getOrganizationById } from '@/lib/organizations/queries';
import { APP_URL } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

function redirectToOrg(slug: string, error?: string) {
  const url = new URL(`${APP_URL}/organizations/${slug}/linkedin`);
  if (error) url.searchParams.set('error', error);
  return NextResponse.redirect(url.toString());
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/organizations?error=${encodeURIComponent('Missing code or state')}`);
  }

  const oauthState = await getOAuthStateCookie();
  await deleteOAuthStateCookie();

  if (
    !oauthState ||
    oauthState.state !== state ||
    oauthState.provider !== LINKEDIN_PROVIDER ||
    !oauthState.organizationId
  ) {
    return NextResponse.redirect(`${APP_URL}/organizations?error=${encodeURIComponent('Invalid state')}`);
  }

  const { organizationId } = oauthState;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent('Login required')}`);
  }

  const role = await getUserRoleInOrganization(organizationId, user.id);
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.redirect(`${APP_URL}/organizations?error=${encodeURIComponent('Permission denied')}`);
  }

  const org = await getOrganizationById(organizationId);
  if (!org) {
    return NextResponse.redirect(`${APP_URL}/organizations?error=${encodeURIComponent('Organization not found')}`);
  }

  try {
    const redirectUri = getLinkedInOrgRedirectUri();
    const tokens = await exchangeLinkedInCode(code, redirectUri);
    const linkedInUser = await fetchLinkedInUser(tokens.access_token);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    const credential = await prisma.orgLinkedInCredential.upsert({
      where: { organizationId },
      create: {
        organizationId,
        connectedByUserId: user.id,
        providerUserId: linkedInUser.sub,
        providerUsername: linkedInUser.name ?? linkedInUser.given_name ?? null,
        accessToken: tokens.access_token,
        expiresAt,
        scopesGranted: tokens.scope ?? null,
        disconnectedAt: null,
      },
      update: {
        connectedByUserId: user.id,
        providerUserId: linkedInUser.sub,
        providerUsername: linkedInUser.name ?? linkedInUser.given_name ?? null,
        accessToken: tokens.access_token,
        expiresAt,
        scopesGranted: tokens.scope ?? null,
        disconnectedAt: null,
        lastVerifiedAt: new Date(),
      },
    });

    // Discover pages the token owner admins
    let pages: Array<{ id: string; name: string; logoUrl?: string }> = [];
    try {
      pages = await fetchLinkedInAdminPages(tokens.access_token);
    } catch (err) {
      console.error('Failed to fetch LinkedIn admin pages:', err);
    }

    // Upsert discovered pages; remove pages no longer returned
    const discoveredIds = pages.map((p) => p.id);

    for (const page of pages) {
      await prisma.orgLinkedInPage.upsert({
        where: {
          credentialId_linkedInPageId: {
            credentialId: credential.id,
            linkedInPageId: page.id,
          },
        },
        create: {
          credentialId: credential.id,
          linkedInPageId: page.id,
          pageName: page.name,
          pageLogoUrl: page.logoUrl ?? null,
          lastSyncedAt: new Date(),
        },
        update: {
          pageName: page.name,
          pageLogoUrl: page.logoUrl ?? null,
          lastSyncedAt: new Date(),
        },
      });
    }

    // Remove pages no longer in the response
    if (discoveredIds.length > 0) {
      await prisma.orgLinkedInPage.deleteMany({
        where: {
          credentialId: credential.id,
          linkedInPageId: { notIn: discoveredIds },
        },
      });
    }

    return redirectToOrg(org.slug);
  } catch (error) {
    console.error('LinkedIn org-callback error:', error);
    return redirectToOrg(
      org.slug,
      error instanceof Error ? error.message : 'Failed to connect LinkedIn'
    );
  }
}
