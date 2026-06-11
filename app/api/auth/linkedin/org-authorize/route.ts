import { NextRequest, NextResponse } from 'next/server';
import {
  buildLinkedInOrgAuthUrl,
  generateState,
  LINKEDIN_PROVIDER,
} from '@/lib/auth/oauth-linkedin';
import { setOAuthStateCookie } from '@/lib/auth/oauth-state';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';
import { APP_URL } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent('Login required')}`);
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    if (!organizationId) {
      return NextResponse.redirect(`${APP_URL}/organizations?error=${encodeURIComponent('organizationId required')}`);
    }

    const role = await getUserRoleInOrganization(organizationId, user.id);
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.redirect(
        `${APP_URL}/organizations?error=${encodeURIComponent('You must be an owner or admin to connect LinkedIn')}`
      );
    }

    const state = generateState();

    await setOAuthStateCookie({
      state,
      codeVerifier: '',
      link: false,
      provider: LINKEDIN_PROVIDER,
      organizationId,
    });

    const authUrl = buildLinkedInOrgAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error: unknown) {
    console.error('LinkedIn org-authorize error:', error);
    const message = error instanceof Error ? error.message : 'OAuth configuration error';
    return NextResponse.redirect(`${APP_URL}/organizations?error=${encodeURIComponent(message)}`);
  }
}
