/**
 * LinkedIn personal company pages — E2E tests (PR #42)
 *
 * Feature under test
 * ------------------
 * Users can publish to LinkedIn company pages they administer via their
 * personal LinkedIn connection:
 *
 *  - Link mode (/api/auth/linkedin/authorize?link=true) requests org scopes.
 *  - POST /api/linkedin/sync-pages discovers pages into LinkedInPersonalPage.
 *  - Pages surface as posting targets of kind 'personalPage' in
 *    GET/PUT /api/linkedin/posting-targets, the /integrations Connected
 *    Accounts card, the compose form, and scheduled-post editing.
 *  - A page reachable through both an org credential and the personal
 *    connection appears only once (org wins).
 *
 * Auth / data requirements
 * ------------------------
 * No real LinkedIn credentials are used.  Browser flows intercept
 * /api/linkedin/* with page.route().  API round-trip tests use two dedicated
 * seeded users created via Prisma in beforeAll (idempotent upserts, mirroring
 * linkedin-posting-targets.spec.ts):
 *
 *  - testlinkedinpages@example.com — LinkedIn identity with the org scope,
 *    one assigned org page, and two LinkedInPersonalPage rows (one duplicating
 *    the org page's linkedInPageId, one unique).
 *  - testlinkedinnoscope@example.com — LinkedIn identity WITHOUT the org
 *    scope (an identity linked before this change).
 *
 * Covered scenarios
 * -----------------
 * Link-mode OAuth scopes
 *   1. /api/auth/linkedin/authorize?link=true redirects to LinkedIn with the
 *      org scopes (rw_organization_admin, w_organization_social).
 *   2. Plain sign-in authorize keeps the minimal scopes (no org scopes).
 *
 * POST /api/linkedin/sync-pages — guards
 *   3. Unauthenticated request returns 401.
 *   4. User without a LinkedIn identity returns 400 code "not_linked".
 *   5. Identity linked without the org scope returns 400 code
 *      "org_scope_missing" (the pre-change identity case).
 *
 * GET/PUT /api/linkedin/posting-targets — personalPage kind (seeded user)
 *   6. GET returns personal + orgPage + personalPage targets and dedupes the
 *      shared page: org credential wins, the personal duplicate is skipped.
 *   7. PUT with an unknown personalPageId returns 400.
 *   8. PUT [{ kind: 'personalPage' }] round-trips: personal/orgPage disabled,
 *      personalPage enabled; PUT all three re-enables everything.
 *
 * /integrations — Connected Accounts → LinkedIn
 *   9. personalPage posting target renders as a "(company page)" checkbox.
 *  10. "Sync company pages" success shows a count and refreshes the
 *      posting-target list with the new page.
 *  11. org_scope_missing response shows the Reconnect notice with a
 *      "Reconnect LinkedIn" link to the link-mode authorize URL.
 *  12. Generic sync failure surfaces an error alert.
 *
 * Compose form — personalPage destinations
 *  13. Destination list shows the company page with personal checked by
 *      default; the company page can be selected.
 *  14. The first personalPage is the default destination when neither the
 *      personal profile nor an org page is enabled.
 *  15. Submitting with a company page destination sends
 *      linkedInTargets [{ kind: 'personal' }, { kind: 'personalPage', … }]
 *      to /api/messages.
 *
 * Scheduled posts — edit modal
 *  16. Editing a scheduled post shows the saved company-page destination
 *      checked, and saving sends the personalPage target in the PATCH body.
 */

import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: resolve(process.cwd(), '.env.local') });
loadDotenv({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { expect, test, type Page } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from './helpers/auth';

// ---------------------------------------------------------------------------
// Seeded users
// ---------------------------------------------------------------------------

/** LinkedIn identity linked WITH the org scope + org page + personal pages. */
const PP_USER = {
  email: process.env.TEST_LINKEDIN_PAGES_USER_EMAIL ?? 'testlinkedinpages@example.com',
  password: process.env.TEST_LINKEDIN_PAGES_USER_PASSWORD ?? 'testpassword4',
};
const PP_USERNAME = 'testlipages';
const PP_DISPLAY_NAME = 'LinkedIn Pages User';
const PP_ORG_NAME = 'E2E LinkedIn Pages Org';
const PP_ORG_SLUG = 'e2e-linkedin-pages-org';
/** linkedInPageId reachable through BOTH the org credential and personally. */
const SHARED_LINKEDIN_PAGE_ID = '880011';
const SHARED_PAGE_NAME = 'E2E Shared Company Page';
/** linkedInPageId reachable ONLY through the personal connection. */
const PERSONAL_ONLY_LINKEDIN_PAGE_ID = '880022';
const PERSONAL_ONLY_PAGE_NAME = 'E2E Personal Only Page';
const ORG_SCOPE =
  'openid profile email w_member_social rw_organization_admin w_organization_social';

/** LinkedIn identity linked BEFORE this change — token but no org scope. */
const NOSCOPE_USER = {
  email: process.env.TEST_LINKEDIN_NOSCOPE_USER_EMAIL ?? 'testlinkedinnoscope@example.com',
  password: process.env.TEST_LINKEDIN_NOSCOPE_USER_PASSWORD ?? 'testpassword5',
};
const NOSCOPE_USERNAME = 'testlinoscope';

/** Seeded ids captured in beforeAll. */
let seededOrgPageId = '';
let seededPersonalOnlyPageId = '';

async function withPrisma<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const prisma = new PrismaClient();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * fullyParallel runs beforeAll once per worker, so concurrent workers can race
 * the same create branch of an upsert (P2002 unique-constraint violation).
 * Retrying makes the loser take the update branch on the second pass.
 */
async function seedRetryingUniqueRaces(seed: () => Promise<void>, maxAttempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      await seed();
      return;
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code !== 'P2002' || attempt >= maxAttempts) throw error;
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
}

test.beforeAll(async () => {
  await seedRetryingUniqueRaces(seedTestData);
});

async function seedTestData() {
  await withPrisma(async (prisma) => {
    // ----- PP_USER: identity with org scope, org page, personal pages -----
    const ppHash = await hash(PP_USER.password, 12);
    const ppUser = await prisma.user.upsert({
      where: { email: PP_USER.email },
      update: { emailVerified: true },
      create: {
        email: PP_USER.email,
        username: PP_USERNAME,
        displayName: PP_DISPLAY_NAME,
        passwordHash: ppHash,
        emailVerified: true,
        customerStatus: 'subscriber',
      },
    });

    const identity = await prisma.linkedIdentity.upsert({
      where: { userId_provider: { userId: ppUser.id, provider: 'linkedin' } },
      update: {
        providerUsername: PP_DISPLAY_NAME,
        providerData: { access_token: 'e2e-fake-token', scope: ORG_SCOPE },
      },
      create: {
        userId: ppUser.id,
        provider: 'linkedin',
        providerUserId: 'e2e-li-pages-user',
        providerUsername: PP_DISPLAY_NAME,
        providerData: { access_token: 'e2e-fake-token', scope: ORG_SCOPE },
      },
    });

    const org = await prisma.organization.upsert({
      where: { slug: PP_ORG_SLUG },
      update: {},
      create: { name: PP_ORG_NAME, slug: PP_ORG_SLUG, isPublic: false },
    });

    const credential = await prisma.orgLinkedInCredential.upsert({
      where: { organizationId: org.id },
      update: { disconnectedAt: null, expiresAt: null },
      create: {
        organizationId: org.id,
        connectedByUserId: ppUser.id,
        providerUserId: 'e2e-li-pages-admin',
        accessToken: 'e2e-fake-org-token',
      },
    });

    const orgPage = await prisma.orgLinkedInPage.upsert({
      where: {
        credentialId_linkedInPageId: {
          credentialId: credential.id,
          linkedInPageId: SHARED_LINKEDIN_PAGE_ID,
        },
      },
      update: { pageName: SHARED_PAGE_NAME },
      create: {
        credentialId: credential.id,
        linkedInPageId: SHARED_LINKEDIN_PAGE_ID,
        pageName: SHARED_PAGE_NAME,
      },
    });
    seededOrgPageId = orgPage.id;

    await prisma.orgLinkedInPageAssignment.upsert({
      where: { pageId_userId: { pageId: orgPage.id, userId: ppUser.id } },
      update: {},
      create: { pageId: orgPage.id, userId: ppUser.id, assignedByUserId: ppUser.id },
    });

    // Personal page that DUPLICATES the org page's linkedInPageId — must be
    // skipped by the dedupe (org wins).
    await prisma.linkedInPersonalPage.upsert({
      where: {
        identityId_linkedInPageId: {
          identityId: identity.id,
          linkedInPageId: SHARED_LINKEDIN_PAGE_ID,
        },
      },
      update: { pageName: SHARED_PAGE_NAME },
      create: {
        identityId: identity.id,
        linkedInPageId: SHARED_LINKEDIN_PAGE_ID,
        pageName: SHARED_PAGE_NAME,
        lastSyncedAt: new Date(),
      },
    });

    // Personal page only reachable through the personal connection.
    const personalOnly = await prisma.linkedInPersonalPage.upsert({
      where: {
        identityId_linkedInPageId: {
          identityId: identity.id,
          linkedInPageId: PERSONAL_ONLY_LINKEDIN_PAGE_ID,
        },
      },
      update: { pageName: PERSONAL_ONLY_PAGE_NAME },
      create: {
        identityId: identity.id,
        linkedInPageId: PERSONAL_ONLY_LINKEDIN_PAGE_ID,
        pageName: PERSONAL_ONLY_PAGE_NAME,
        lastSyncedAt: new Date(),
      },
    });
    seededPersonalOnlyPageId = personalOnly.id;

    // ----- NOSCOPE_USER: identity linked before the org-scope change -----
    const noscopeHash = await hash(NOSCOPE_USER.password, 12);
    const noscopeUser = await prisma.user.upsert({
      where: { email: NOSCOPE_USER.email },
      update: { emailVerified: true },
      create: {
        email: NOSCOPE_USER.email,
        username: NOSCOPE_USERNAME,
        displayName: 'LinkedIn NoScope User',
        passwordHash: noscopeHash,
        emailVerified: true,
        customerStatus: 'subscriber',
      },
    });

    await prisma.linkedIdentity.upsert({
      where: { userId_provider: { userId: noscopeUser.id, provider: 'linkedin' } },
      update: { providerData: { access_token: 'e2e-fake-token' } },
      create: {
        userId: noscopeUser.id,
        provider: 'linkedin',
        providerUserId: 'e2e-li-noscope-user',
        providerUsername: 'LinkedIn NoScope User',
        providerData: { access_token: 'e2e-fake-token' },
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Route-interception helpers for browser flows
// ---------------------------------------------------------------------------

type StubTarget =
  | { kind: 'personal'; label: string; avatarUrl: null; enabled: boolean }
  | {
      kind: 'orgPage';
      pageId: string;
      linkedInPageId: string;
      label: string;
      logoUrl: null;
      enabled: boolean;
    }
  | {
      kind: 'personalPage';
      personalPageId: string;
      linkedInPageId: string;
      label: string;
      logoUrl: string | null;
      enabled: boolean;
    };

function personalTarget(enabled: boolean, label = 'Test Person'): StubTarget {
  return { kind: 'personal', label, avatarUrl: null, enabled };
}

function personalPageTarget(
  personalPageId: string,
  label: string,
  enabled: boolean,
  logoUrl: string | null = null
): StubTarget {
  return {
    kind: 'personalPage',
    personalPageId,
    linkedInPageId: `li-${personalPageId}`,
    label,
    logoUrl,
    enabled,
  };
}

/** Stub GET /api/linkedin/posting-targets; lets other methods fall through. */
async function stubPostingTargets(page: Page, targets: StubTarget[]) {
  await page.route('/api/linkedin/posting-targets', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ targets }),
      });
    } else {
      route.fallback();
    }
  });
}

/** Stub /api/user/identities with a connected LinkedIn account. */
async function stubLinkedInIdentity(page: Page) {
  await page.route('/api/user/identities', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        identities: [
          {
            id: 'li-identity-1',
            provider: 'linkedin',
            providerUsername: 'Test Person',
            profileUrl: 'https://www.linkedin.com/in/testperson',
            avatarUrl: null,
            connectedAt: new Date().toISOString(),
            lastVerifiedAt: null,
          },
        ],
      }),
    });
  });
}

/**
 * Open the compose form's posting-options menu regardless of its initial
 * state (other specs persist showAdvancedPostSettings for the shared
 * subscriber account).
 */
async function openPostingOptions(page: Page) {
  const toggle = page.getByRole('button', { name: 'Posting options' });
  await expect(toggle).toBeVisible();
  const scheduleButton = page.getByRole('button', { name: 'Schedule post' });
  if (!(await scheduleButton.isVisible())) {
    await toggle.click();
  }
  await expect(scheduleButton).toBeVisible();
}

// ---------------------------------------------------------------------------
// Link-mode OAuth — org scopes on the consent redirect
// ---------------------------------------------------------------------------

test.describe('LinkedIn authorize — link mode requests org scopes', () => {
  test.beforeEach(async ({ request }) => {
    const status = await request.get('/api/auth/linkedin/status');
    const body = await status.json().catch(() => ({}));
    test.skip(body.configured !== true, 'LinkedIn OAuth is not configured in this environment');
  });

  test('link=true redirects to LinkedIn with rw_organization_admin scope', async ({
    request,
  }) => {
    const response = await request.get('/api/auth/linkedin/authorize?link=true', {
      maxRedirects: 0,
    });

    expect([302, 307, 308]).toContain(response.status());
    const location = decodeURIComponent(response.headers()['location'] ?? '');
    expect(location).toContain('linkedin.com/oauth');
    expect(location).toContain('rw_organization_admin');
    expect(location).toContain('w_organization_social');
  });

  test('plain sign-in keeps the minimal scopes (no org scopes)', async ({ request }) => {
    const response = await request.get('/api/auth/linkedin/authorize', {
      maxRedirects: 0,
    });

    expect([302, 307, 308]).toContain(response.status());
    const location = decodeURIComponent(response.headers()['location'] ?? '');
    expect(location).toContain('linkedin.com/oauth');
    expect(location).toContain('w_member_social');
    expect(location).not.toContain('rw_organization_admin');
  });
});

// ---------------------------------------------------------------------------
// POST /api/linkedin/sync-pages — auth and scope guards
// ---------------------------------------------------------------------------

test.describe('sync-pages API — auth and scope guards', () => {
  test('POST returns 401 for unauthenticated request', async ({ page }) => {
    const response = await page.request.post('/api/linkedin/sync-pages');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('POST returns 400 code not_linked when LinkedIn is not connected', async ({ page }) => {
    // TEST_USER has no LinkedIn identity in the test database.
    await loginAs(page, TEST_USER);

    const response = await page.request.post('/api/linkedin/sync-pages');
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('not_linked');
    expect(body.error).toMatch(/not linked/i);
  });

  test('POST returns 400 code org_scope_missing for a pre-change identity', async ({
    page,
  }) => {
    // NOSCOPE_USER's identity was linked without the rw_organization_admin
    // scope — this is the "identity linked before this change" case from the
    // PR test plan: the client must be told to reconnect.
    await loginAs(page, NOSCOPE_USER);

    const response = await page.request.post('/api/linkedin/sync-pages');
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('org_scope_missing');
    expect(body.error).toMatch(/reconnect/i);
  });
});

// ---------------------------------------------------------------------------
// posting-targets API — personalPage kind + org-wins dedupe (seeded data)
// ---------------------------------------------------------------------------

type TargetWithEnabled = {
  kind: string;
  pageId?: string;
  personalPageId?: string;
  linkedInPageId?: string;
  label?: string;
  enabled: boolean;
};

test.describe('posting-targets API — personalPage targets', () => {
  test('GET dedupes a page reachable via org and personal connections (org wins)', async ({
    page,
  }) => {
    await loginAs(page, PP_USER);

    const response = await page.request.get('/api/linkedin/posting-targets');
    expect(response.status()).toBe(200);
    const targets = (await response.json()).targets as TargetWithEnabled[];

    // Personal profile target is present.
    expect(targets.some((t) => t.kind === 'personal')).toBe(true);

    // The shared page appears exactly once — as the org page, not the
    // personal-page duplicate.
    const sharedMatches = targets.filter(
      (t) => t.linkedInPageId === SHARED_LINKEDIN_PAGE_ID
    );
    expect(sharedMatches).toHaveLength(1);
    expect(sharedMatches[0].kind).toBe('orgPage');
    expect(sharedMatches[0].pageId).toBe(seededOrgPageId);

    // The personal-only page surfaces as a personalPage target.
    const personalOnly = targets.find(
      (t) => t.kind === 'personalPage' && t.linkedInPageId === PERSONAL_ONLY_LINKEDIN_PAGE_ID
    );
    expect(personalOnly).toBeDefined();
    expect(personalOnly!.personalPageId).toBe(seededPersonalOnlyPageId);
    expect(personalOnly!.label).toBe(PERSONAL_ONLY_PAGE_NAME);
  });

  test('PUT rejects a personalPageId that is not available to the user', async ({ page }) => {
    await loginAs(page, PP_USER);

    const response = await page.request.put('/api/linkedin/posting-targets', {
      data: {
        targets: [{ kind: 'personalPage', personalPageId: 'not-my-personal-page-id' }],
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/not available/i);
  });

  test('PUT personalPage-only round-trips enabled state', async ({ page }) => {
    // Reset to "never saved preferences" inside the test so parallel workers
    // cannot race the assertions below.
    await withPrisma(async (prisma) => {
      const user = await prisma.user.findUnique({ where: { email: PP_USER.email } });
      expect(user).not.toBeNull();
      await prisma.linkedInPostingTargetPreference.deleteMany({
        where: { userId: user!.id },
      });
    });

    await loginAs(page, PP_USER);

    const findPersonal = (targets: TargetWithEnabled[]) =>
      targets.find((t) => t.kind === 'personal');
    const findOrgPage = (targets: TargetWithEnabled[]) =>
      targets.find((t) => t.kind === 'orgPage' && t.pageId === seededOrgPageId);
    const findPersonalPage = (targets: TargetWithEnabled[]) =>
      targets.find(
        (t) => t.kind === 'personalPage' && t.personalPageId === seededPersonalOnlyPageId
      );

    // 1. Zero saved preferences => every available target is enabled.
    const initial = await page.request.get('/api/linkedin/posting-targets');
    expect(initial.status()).toBe(200);
    const initialTargets = (await initial.json()).targets as TargetWithEnabled[];
    expect(findPersonal(initialTargets)?.enabled).toBe(true);
    expect(findOrgPage(initialTargets)?.enabled).toBe(true);
    expect(findPersonalPage(initialTargets)?.enabled).toBe(true);

    // 2. PUT only the personal page — personal + org page become disabled.
    const putPersonalPage = await page.request.put('/api/linkedin/posting-targets', {
      data: {
        targets: [{ kind: 'personalPage', personalPageId: seededPersonalOnlyPageId }],
      },
    });
    expect(putPersonalPage.status()).toBe(200);
    const afterPut = (await putPersonalPage.json()).targets as TargetWithEnabled[];
    expect(findPersonal(afterPut)?.enabled).toBe(false);
    expect(findOrgPage(afterPut)?.enabled).toBe(false);
    expect(findPersonalPage(afterPut)?.enabled).toBe(true);

    // 3. GET round-trips the persisted state.
    const roundTrip = await page.request.get('/api/linkedin/posting-targets');
    const roundTripTargets = (await roundTrip.json()).targets as TargetWithEnabled[];
    expect(findPersonal(roundTripTargets)?.enabled).toBe(false);
    expect(findOrgPage(roundTripTargets)?.enabled).toBe(false);
    expect(findPersonalPage(roundTripTargets)?.enabled).toBe(true);

    // 4. PUT all three — everything is enabled again.
    const putAll = await page.request.put('/api/linkedin/posting-targets', {
      data: {
        targets: [
          { kind: 'personal' },
          { kind: 'orgPage', pageId: seededOrgPageId },
          { kind: 'personalPage', personalPageId: seededPersonalOnlyPageId },
        ],
      },
    });
    expect(putAll.status()).toBe(200);
    const final = await page.request.get('/api/linkedin/posting-targets');
    const finalTargets = (await final.json()).targets as TargetWithEnabled[];
    expect(findPersonal(finalTargets)?.enabled).toBe(true);
    expect(findOrgPage(finalTargets)?.enabled).toBe(true);
    expect(findPersonalPage(finalTargets)?.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// /integrations — Connected Accounts → LinkedIn → Company pages
// ---------------------------------------------------------------------------

test.describe('Integrations page — LinkedIn company pages', () => {
  test('personalPage posting target renders as a "(company page)" checkbox', async ({
    page,
  }) => {
    await loginAs(page, TEST_USER);
    await stubPostingTargets(page, [
      personalTarget(true),
      personalPageTarget('pp-a', 'Acme Co', true),
      personalPageTarget('pp-b', 'Beta Co', false),
    ]);

    await page.goto('/integrations');

    await expect(page.getByText('Posting targets')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Test Person (personal)' })
    ).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Acme Co (company page)' })).toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: 'Beta Co (company page)' })
    ).not.toBeChecked();
  });

  test('personalPage target with a logoUrl renders a 20×20 rounded image', async ({
    page,
  }) => {
    // Use an accessible 1×1 PNG served from the same origin so the browser
    // does not hit an external network and the load event fires deterministically.
    const LOGO_URL =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await loginAs(page, TEST_USER);
    await stubPostingTargets(page, [
      personalPageTarget('pp-logo', 'Logo Corp', true, LOGO_URL),
    ]);

    await page.goto('/integrations');

    await expect(page.getByText('Posting targets')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Logo Corp (company page)' })).toBeChecked();

    // The logo image must appear alongside the checkbox label.
    const img = page.locator(`img[src="${LOGO_URL}"]`);
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('width', '20');
    await expect(img).toHaveAttribute('height', '20');
    // Rendered as a rounded circle (Bootstrap class).
    await expect(img).toHaveClass(/rounded-circle/);
  });

  test('"Sync company pages" success shows a count and refreshes the target list', async ({
    page,
  }) => {
    // PP_USER has a real LinkedIn identity row, so the server-rendered
    // Company pages block appears. The sync call itself is stubbed.
    await loginAs(page, PP_USER);

    let synced = false;
    await page.route('/api/linkedin/posting-targets', (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const targets = synced
        ? [
            personalTarget(true, PP_DISPLAY_NAME),
            personalPageTarget('pp-new-a', 'E2E Synced Page A', true),
            personalPageTarget('pp-new-b', 'E2E Synced Page B', true),
          ]
        : [personalTarget(true, PP_DISPLAY_NAME)];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ targets }),
      });
    });
    await page.route('/api/linkedin/sync-pages', (route) => {
      synced = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pages: [
            {
              id: 'pp-new-a',
              linkedInPageId: '770001',
              pageName: 'E2E Synced Page A',
              pageLogoUrl: null,
              lastSyncedAt: new Date().toISOString(),
            },
            {
              id: 'pp-new-b',
              linkedInPageId: '770002',
              pageName: 'E2E Synced Page B',
              pageLogoUrl: null,
              lastSyncedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto('/integrations');

    await expect(page.getByText('Company pages', { exact: true })).toBeVisible();
    const syncButton = page.getByRole('button', { name: 'Sync company pages' });
    await expect(syncButton).toBeVisible();

    // Before syncing, only the personal target is listed.
    await expect(
      page.getByRole('checkbox', { name: `${PP_DISPLAY_NAME} (personal)` })
    ).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'E2E Synced Page A (company page)' })
    ).not.toBeVisible();

    await syncButton.click();

    await expect(page.getByText(/Synced 2 LinkedIn company pages/i)).toBeVisible();
    // The posting-target list refreshed with the discovered pages.
    await expect(
      page.getByRole('checkbox', { name: 'E2E Synced Page A (company page)' })
    ).toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: 'E2E Synced Page B (company page)' })
    ).toBeChecked();
  });

  test('org_scope_missing shows the Reconnect notice with a link-mode authorize URL', async ({
    page,
  }) => {
    await loginAs(page, PP_USER);
    await stubPostingTargets(page, [personalTarget(true, PP_DISPLAY_NAME)]);
    await page.route('/api/linkedin/sync-pages', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error:
            'Your LinkedIn connection does not include company page access. Reconnect LinkedIn to grant the required permissions.',
          code: 'org_scope_missing',
        }),
      });
    });

    await page.goto('/integrations');

    await page.getByRole('button', { name: 'Sync company pages' }).click();

    await expect(
      page.getByText(/does not include company page access/i)
    ).toBeVisible();
    const reconnectLink = page.getByRole('link', { name: 'Reconnect LinkedIn' });
    await expect(reconnectLink).toBeVisible();
    await expect(reconnectLink).toHaveAttribute(
      'href',
      /\/api\/auth\/linkedin\/authorize\?link=true/
    );
  });

  test('generic sync failure surfaces an error alert', async ({ page }) => {
    await loginAs(page, PP_USER);
    await stubPostingTargets(page, [personalTarget(true, PP_DISPLAY_NAME)]);
    await page.route('/api/linkedin/sync-pages', (route) => {
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to sync LinkedIn company pages' }),
      });
    });

    await page.goto('/integrations');

    await page.getByRole('button', { name: 'Sync company pages' }).click();

    await expect(
      page.getByText('Failed to sync LinkedIn company pages')
    ).toBeVisible();
    // No reconnect notice for non-scope failures.
    await expect(
      page.getByRole('link', { name: 'Reconnect LinkedIn' })
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Compose form — company-page destinations
// ---------------------------------------------------------------------------

test.describe('Compose — LinkedIn company-page destinations', () => {
  // Keep the posting-options PATCH from persisting state for the shared
  // subscriber account across parallel tests.
  test.beforeEach(async ({ page }) => {
    await page.route('/api/user/update', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { showAdvancedPostSettings: true } }),
      });
    });
  });

  test('destination list shows the company page with personal checked by default', async ({
    page,
  }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);
    await stubPostingTargets(page, [
      personalTarget(true),
      personalPageTarget('pp-1', 'Acme Co Page', true),
    ]);

    await page.goto('/dashboard');
    await openPostingOptions(page);
    await page.getByRole('button', { name: /Cross-post to LinkedIn/i }).click();

    await expect(page.getByText('LinkedIn destinations')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Test Person (personal)' })
    ).toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: 'Acme Co Page (company page)' })
    ).not.toBeChecked();
  });

  test('first company page is the default when personal and org pages are unavailable', async ({
    page,
  }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);
    await stubPostingTargets(page, [
      personalPageTarget('pp-1', 'Acme Co Page', true),
      personalPageTarget('pp-2', 'Beta Co Page', true),
    ]);

    await page.goto('/dashboard');
    await openPostingOptions(page);
    await page.getByRole('button', { name: /Cross-post to LinkedIn/i }).click();

    await expect(page.getByText('LinkedIn destinations')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Test Person (personal)' })
    ).not.toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Acme Co Page (company page)' })
    ).toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: 'Beta Co Page (company page)' })
    ).not.toBeChecked();

    // The summary names the default company page.
    await expect(page.getByText(/Posting to:.*LinkedIn \(Acme Co Page\)/i)).toBeVisible();
  });

  test('submitting with a company page sends a personalPage target to /api/messages', async ({
    page,
  }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);
    await stubPostingTargets(page, [
      personalTarget(true),
      personalPageTarget('pp-1', 'Acme Co Page', true),
    ]);

    let capturedBody: Record<string, unknown> | null = null;
    await page.route('/api/messages', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      capturedBody = JSON.parse(route.request().postData() ?? '{}');
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-li-pp-1',
          content: capturedBody?.content ?? '',
          crossPostResults: [
            {
              providerId: 'linkedin',
              instanceName: 'LinkedIn',
              success: true,
              url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:789/',
            },
          ],
        }),
      });
    });

    await page.goto('/dashboard');
    await openPostingOptions(page);
    await page.getByRole('button', { name: /Cross-post to LinkedIn/i }).click();

    // Personal is selected by default; also select the company page.
    await page.getByRole('checkbox', { name: 'Acme Co Page (company page)' }).check();
    await expect(
      page.getByRole('checkbox', { name: 'Test Person (personal)' })
    ).toBeChecked();

    await page
      .getByPlaceholder("What's on your mind?")
      .fill('Company page LinkedIn post from E2E');
    await page.getByRole('button', { name: 'Post Message' }).click();

    await expect(page.getByPlaceholder("What's on your mind?")).toHaveValue('', {
      timeout: 5000,
    });

    expect(capturedBody).not.toBeNull();
    const captured = capturedBody as unknown as Record<string, unknown>;
    expect(captured.crossPostToLinkedIn).toBe(true);
    expect(captured.linkedInTargets).toEqual([
      { kind: 'personal' },
      { kind: 'personalPage', personalPageId: 'pp-1' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Scheduled posts — edit modal keeps and saves personalPage destinations
// ---------------------------------------------------------------------------

test.describe('Edit scheduled post — LinkedIn company-page destination', () => {
  test('saved company-page destination is shown checked and survives a save', async ({
    page,
  }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);
    await stubPostingTargets(page, [
      personalTarget(true),
      personalPageTarget('pp-1', 'Acme Co Page', true),
    ]);

    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduledMessage = {
      id: 'sched-pp-1',
      content: 'Scheduled company page post',
      publiclyVisible: false,
      scheduledAt,
      scheduledCrossPostConfig: {
        mastodonProviderIds: [],
        crossPostToBluesky: false,
        crossPostToLinkedIn: true,
        crossPostToTwitter: false,
        linkedInTargets: [{ kind: 'personalPage', personalPageId: 'pp-1' }],
      },
      user: {
        id: 'user-sub',
        username: 'testsubscriber',
        displayName: 'Test Subscriber',
        avatarUrl: null,
      },
    };

    await page.route('/api/messages/scheduled*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: [scheduledMessage] }),
      });
    });

    let capturedPatch: Record<string, unknown> | null = null;
    await page.route('/api/messages/sched-pp-1', (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      capturedPatch = JSON.parse(route.request().postData() ?? '{}');
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scheduledMessage),
      });
    });

    await page.goto('/dashboard/scheduled');

    await expect(page.getByText('Scheduled company page post')).toBeVisible();
    await page.getByRole('button', { name: 'Edit scheduled post' }).click();

    await expect(
      page.getByRole('heading', { name: 'Edit scheduled post' })
    ).toBeVisible();

    // LinkedIn cross-post is on; the saved company page destination is
    // checked while the personal profile is not.
    await expect(page.getByRole('checkbox', { name: 'LinkedIn', exact: true })).toBeChecked();
    await expect(page.getByText('LinkedIn destinations')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Acme Co Page (company page)' })
    ).toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: 'Test Person (personal)' })
    ).not.toBeChecked();

    // Add the personal profile and save.
    await page.getByRole('checkbox', { name: 'Test Person (personal)' }).check();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(
      page.getByRole('heading', { name: 'Edit scheduled post' })
    ).not.toBeVisible();

    expect(capturedPatch).not.toBeNull();
    const config = (capturedPatch as unknown as Record<string, unknown>)
      .scheduledCrossPostConfig as Record<string, unknown>;
    expect(config.crossPostToLinkedIn).toBe(true);
    expect(config.linkedInTargets).toEqual([
      { kind: 'personalPage', personalPageId: 'pp-1' },
      { kind: 'personal' },
    ]);
  });
});
