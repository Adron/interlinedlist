import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getActiveLinkedInAccessToken,
  hasLinkedInOrgScope,
  type LinkedInProviderData,
} from '@/lib/linkedin/provider-data';
import { syncLinkedInPersonalPages } from '@/lib/linkedin/personal-pages';

export const dynamic = 'force-dynamic';

/**
 * POST /api/linkedin/sync-pages
 *
 * Re-discovers the LinkedIn company pages the current user administers via
 * their personal LinkedIn connection and syncs LinkedInPersonalPage rows.
 * Requires the identity to have been linked with the rw_organization_admin
 * scope; otherwise returns 400 with code "org_scope_missing" so the client
 * can prompt a reconnect through the link authorize flow.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identity = await prisma.linkedIdentity.findFirst({
    where: { userId: user.id, provider: 'linkedin' },
    select: { id: true, providerData: true },
  });

  if (!identity) {
    return NextResponse.json(
      { error: 'Your LinkedIn account is not linked', code: 'not_linked' },
      { status: 400 }
    );
  }

  const providerData = identity.providerData as LinkedInProviderData | null;
  const accessToken = getActiveLinkedInAccessToken(providerData);

  if (!accessToken || !hasLinkedInOrgScope(providerData?.scope)) {
    return NextResponse.json(
      {
        error:
          'Your LinkedIn connection does not include company page access. Reconnect LinkedIn to grant the required permissions.',
        code: 'org_scope_missing',
      },
      { status: 400 }
    );
  }

  try {
    const pages = await syncLinkedInPersonalPages(identity.id, accessToken);
    return NextResponse.json({
      pages: pages.map((page) => ({
        id: page.id,
        linkedInPageId: page.linkedInPageId,
        pageName: page.pageName,
        pageLogoUrl: page.pageLogoUrl,
        lastSyncedAt: page.lastSyncedAt,
      })),
    });
  } catch (error) {
    console.error('LinkedIn sync-pages error:', error);
    return NextResponse.json(
      { error: 'Failed to sync LinkedIn company pages' },
      { status: 502 }
    );
  }
}
