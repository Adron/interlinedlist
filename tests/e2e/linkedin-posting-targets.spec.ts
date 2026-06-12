/**
 * LinkedIn posting targets — E2E tests
 *
 * Feature under test
 * ------------------
 * Users choose which LinkedIn destinations (personal profile and/or assigned
 * org pages) are available for cross-posting:
 *
 *  - GET  /api/linkedin/posting-targets — available targets + enabled flag
 *  - PUT  /api/linkedin/posting-targets — replace-all preference save
 *  - /integrations — "Posting targets" checkbox list inside the LinkedIn card
 *  - Compose form — per-post destination checkboxes (enabled targets only)
 *
 * Auth / data requirements
 * ------------------------
 * No real LinkedIn credentials are used.  Browser flows intercept
 * /api/linkedin/posting-targets with page.route().  API round-trip tests use
 * a dedicated seeded user (testlinkedintargets@example.com) that gets a fake
 * LinkedIn identity, one org page and an assignment created via Prisma in
 * beforeAll (idempotent upserts, mirroring global-setup.ts).
 *
 * Covered scenarios
 * -----------------
 * API — auth and validation guards
 *   1. GET without a session returns 401.
 *   2. PUT without a session returns 401.
 *   3. PUT with non-array `targets` returns 400.
 *   4. PUT { kind: 'personal' } returns 400 when no LinkedIn identity linked.
 *   5. PUT with a pageId the user is not assigned to returns 400.
 *
 * API — preference round-trip (seeded user)
 *   6. Zero saved preferences => every available target is enabled; PUT a
 *      subset then GET round-trips the enabled state; PUT all re-enables.
 *
 * /integrations — Posting targets card
 *   7. Checkbox list renders with enabled state from GET.
 *   8. Toggling a checkbox updates optimistically and persists via PUT with
 *      the full enabled set.
 *   9. Disabling the last enabled target is blocked with an inline error and
 *      no PUT request.
 *
 * Compose form — per-post destinations
 *  10. LinkedIn toggle is hidden when every target is disabled.
 *  11. Destination list shows only enabled targets; personal is checked by
 *      default.
 *  12. When personal is disabled, the first enabled org page is the default
 *      selection.
 *  13. Submitting with multiple destinations sends linkedInTargets
 *      [{ kind: 'personal' }, { kind: 'orgPage', pageId }] to /api/messages.
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
// Seeded user with a fake LinkedIn identity + one assigned org page
// ---------------------------------------------------------------------------

const LI_USER = {
  email: process.env.TEST_LINKEDIN_USER_EMAIL ?? 'testlinkedintargets@example.com',
  password: process.env.TEST_LINKEDIN_USER_PASSWORD ?? 'testpassword3',
};
const LI_USERNAME = 'testlitargets';
const LI_PERSONAL_LABEL = 'LinkedIn Targets User';
const ORG_NAME = 'E2E LinkedIn Targets Org';
const ORG_SLUG = 'e2e-linkedin-targets-org';
const PAGE_LINKEDIN_ID = '990011';
const PAGE_NAME = 'E2E LinkedIn Test Page';

/** OrgLinkedInPage.id (uuid) of the seeded page, set in beforeAll. */
let seededPageId = '';

async function withPrisma<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const prisma = new PrismaClient();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

test.beforeAll(async () => {
  seededPageId = await withPrisma(async (prisma) => {
    const passwordHash = await hash(LI_USER.password, 12);
    const user = await prisma.user.upsert({
      where: { email: LI_USER.email },
      update: { emailVerified: true },
      create: {
        email: LI_USER.email,
        username: LI_USERNAME,
        displayName: LI_PERSONAL_LABEL,
        passwordHash,
        emailVerified: true,
        customerStatus: 'subscriber',
      },
    });

    await prisma.linkedIdentity.upsert({
      where: { userId_provider: { userId: user.id, provider: 'linkedin' } },
      update: {
        providerUsername: LI_PERSONAL_LABEL,
        providerData: { access_token: 'e2e-fake-token' },
      },
      create: {
        userId: user.id,
        provider: 'linkedin',
        providerUserId: 'e2e-li-user',
        providerUsername: LI_PERSONAL_LABEL,
        providerData: { access_token: 'e2e-fake-token' },
      },
    });

    const org = await prisma.organization.upsert({
      where: { slug: ORG_SLUG },
      update: {},
      create: { name: ORG_NAME, slug: ORG_SLUG, isPublic: false },
    });

    const credential = await prisma.orgLinkedInCredential.upsert({
      where: { organizationId: org.id },
      update: { disconnectedAt: null, expiresAt: null },
      create: {
        organizationId: org.id,
        connectedByUserId: user.id,
        providerUserId: 'e2e-li-admin',
        accessToken: 'e2e-fake-org-token',
      },
    });

    const liPage = await prisma.orgLinkedInPage.upsert({
      where: {
        credentialId_linkedInPageId: {
          credentialId: credential.id,
          linkedInPageId: PAGE_LINKEDIN_ID,
        },
      },
      update: { pageName: PAGE_NAME },
      create: {
        credentialId: credential.id,
        linkedInPageId: PAGE_LINKEDIN_ID,
        pageName: PAGE_NAME,
      },
    });

    await prisma.orgLinkedInPageAssignment.upsert({
      where: { pageId_userId: { pageId: liPage.id, userId: user.id } },
      update: {},
      create: { pageId: liPage.id, userId: user.id, assignedByUserId: user.id },
    });

    return liPage.id;
  });
});

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
    };

function personalTarget(enabled: boolean, label = 'Test Person'): StubTarget {
  return { kind: 'personal', label, avatarUrl: null, enabled };
}

function orgPageTarget(pageId: string, label: string, enabled: boolean): StubTarget {
  return { kind: 'orgPage', pageId, linkedInPageId: `li-${pageId}`, label, logoUrl: null, enabled };
}

/** Stub GET /api/linkedin/posting-targets; lets PUT fall through unless handled. */
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

/**
 * Open the compose form's posting-options menu regardless of its initial
 * state. Other tests persist showAdvancedPostSettings for the shared
 * subscriber account via the real PATCH /api/user/update, so the menu may
 * already be open when the dashboard loads.
 */
async function openPostingOptions(page: Page) {
  const toggle = page.getByRole('button', { name: 'Posting options' });
  await expect(toggle).toBeVisible();
  // "Schedule post" always renders inside the menu, independent of identities.
  const scheduleButton = page.getByRole('button', { name: 'Schedule post' });
  if (!(await scheduleButton.isVisible())) {
    await toggle.click();
  }
  await expect(scheduleButton).toBeVisible();
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

// ---------------------------------------------------------------------------
// API — auth and validation guards
// ---------------------------------------------------------------------------

test.describe('posting-targets API — auth and validation guards', () => {
  test('GET returns 401 for unauthenticated request', async ({ page }) => {
    const response = await page.request.get('/api/linkedin/posting-targets');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('PUT returns 401 for unauthenticated request', async ({ page }) => {
    const response = await page.request.put('/api/linkedin/posting-targets', {
      data: { targets: [{ kind: 'personal' }] },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('PUT returns 400 when targets is not an array', async ({ page }) => {
    await loginAs(page, TEST_USER);

    const response = await page.request.put('/api/linkedin/posting-targets', {
      data: { targets: 'personal' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/array/i);
  });

  test('PUT personal returns 400 when no LinkedIn identity is linked', async ({ page }) => {
    // TEST_USER has no LinkedIn identity in the test database.
    await loginAs(page, TEST_USER);

    const response = await page.request.put('/api/linkedin/posting-targets', {
      data: { targets: [{ kind: 'personal' }] },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/not linked/i);
  });

  test('PUT rejects a pageId the user is not assigned to', async ({ page }) => {
    await loginAs(page, LI_USER);

    const response = await page.request.put('/api/linkedin/posting-targets', {
      data: { targets: [{ kind: 'orgPage', pageId: 'not-assigned-page-id' }] },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/not assigned/i);
  });
});

// ---------------------------------------------------------------------------
// API — preference round-trip with seeded data
// ---------------------------------------------------------------------------

test.describe('posting-targets API — preference round-trip', () => {
  test('zero prefs default to all-enabled; PUT then GET round-trips enabled state', async ({
    page,
  }) => {
    // Reset to "never saved preferences" inside the test so parallel workers
    // re-running beforeAll cannot race the assertions below.
    await withPrisma(async (prisma) => {
      const user = await prisma.user.findUnique({ where: { email: LI_USER.email } });
      expect(user).not.toBeNull();
      await prisma.linkedInPostingTargetPreference.deleteMany({
        where: { userId: user!.id },
      });
    });

    await loginAs(page, LI_USER);

    type TargetWithEnabled = { kind: string; pageId?: string; enabled: boolean };
    const findPersonal = (targets: TargetWithEnabled[]) =>
      targets.find((t) => t.kind === 'personal');
    const findSeededPage = (targets: TargetWithEnabled[]) =>
      targets.find((t) => t.kind === 'orgPage' && t.pageId === seededPageId);

    // 1. Zero saved preferences => every available target is enabled.
    const initial = await page.request.get('/api/linkedin/posting-targets');
    expect(initial.status()).toBe(200);
    const initialTargets = (await initial.json()).targets as TargetWithEnabled[];
    expect(findPersonal(initialTargets)?.enabled).toBe(true);
    expect(findSeededPage(initialTargets)?.enabled).toBe(true);

    // 2. PUT only the personal target — the org page becomes disabled.
    const putPersonal = await page.request.put('/api/linkedin/posting-targets', {
      data: { targets: [{ kind: 'personal' }] },
    });
    expect(putPersonal.status()).toBe(200);
    const afterPut = (await putPersonal.json()).targets as TargetWithEnabled[];
    expect(findPersonal(afterPut)?.enabled).toBe(true);
    expect(findSeededPage(afterPut)?.enabled).toBe(false);

    // 3. GET round-trips the persisted state.
    const roundTrip = await page.request.get('/api/linkedin/posting-targets');
    expect(roundTrip.status()).toBe(200);
    const roundTripTargets = (await roundTrip.json()).targets as TargetWithEnabled[];
    expect(findPersonal(roundTripTargets)?.enabled).toBe(true);
    expect(findSeededPage(roundTripTargets)?.enabled).toBe(false);

    // 4. PUT both targets — everything is enabled again.
    const putBoth = await page.request.put('/api/linkedin/posting-targets', {
      data: {
        targets: [{ kind: 'personal' }, { kind: 'orgPage', pageId: seededPageId }],
      },
    });
    expect(putBoth.status()).toBe(200);
    const final = await page.request.get('/api/linkedin/posting-targets');
    const finalTargets = (await final.json()).targets as TargetWithEnabled[];
    expect(findPersonal(finalTargets)?.enabled).toBe(true);
    expect(findSeededPage(finalTargets)?.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// /integrations — Posting targets section
// ---------------------------------------------------------------------------

test.describe('Integrations page — LinkedIn posting targets', () => {
  test('renders checkbox list with enabled state from the API', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await stubPostingTargets(page, [
      personalTarget(true),
      orgPageTarget('page-a', 'Acme Page', true),
      orgPageTarget('page-b', 'Beta Page', false),
    ]);

    await page.goto('/integrations');

    await expect(page.getByText('Posting targets')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Test Person (personal)' })
    ).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Acme Page (page)' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Beta Page (page)' })).not.toBeChecked();
  });

  test('toggling a target updates optimistically and persists via PUT', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await stubPostingTargets(page, [
      personalTarget(true),
      orgPageTarget('page-a', 'Acme Page', true),
      orgPageTarget('page-b', 'Beta Page', false),
    ]);

    let capturedPutBody: { targets?: Array<Record<string, unknown>> } | null = null;
    await page.route('/api/linkedin/posting-targets', async (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      capturedPutBody = JSON.parse(route.request().postData() ?? '{}');
      // Delay the response so the assertion below observes the optimistic state.
      await new Promise((r) => setTimeout(r, 400));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targets: [
            personalTarget(true),
            orgPageTarget('page-a', 'Acme Page', true),
            orgPageTarget('page-b', 'Beta Page', true),
          ],
        }),
      });
    });

    await page.goto('/integrations');

    const betaCheckbox = page.getByRole('checkbox', { name: 'Beta Page (page)' });
    await expect(betaCheckbox).not.toBeChecked();

    await betaCheckbox.click();

    // Optimistic update — checked before/while the PUT is still in flight.
    await expect(betaCheckbox).toBeChecked();

    // PUT body contains the complete enabled set.
    await expect.poll(() => capturedPutBody).not.toBeNull();
    expect(capturedPutBody!.targets).toEqual([
      { kind: 'personal' },
      { kind: 'orgPage', pageId: 'page-a' },
      { kind: 'orgPage', pageId: 'page-b' },
    ]);

    // No error surfaced and the checkbox stays checked after the response.
    await expect(betaCheckbox).toBeChecked();
    await expect(page.locator('.alert-danger')).toHaveCount(0);
  });

  test('blocks disabling the last enabled target with an inline error and no PUT', async ({
    page,
  }) => {
    await loginAs(page, TEST_USER);
    await stubPostingTargets(page, [
      personalTarget(true),
      orgPageTarget('page-b', 'Beta Page', false),
    ]);

    let putSent = false;
    await page.route('/api/linkedin/posting-targets', (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      putSent = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ targets: [] }),
      });
    });

    await page.goto('/integrations');

    const personalCheckbox = page.getByRole('checkbox', { name: 'Test Person (personal)' });
    await expect(personalCheckbox).toBeChecked();

    await personalCheckbox.click();

    await expect(
      page.getByText(/At least one LinkedIn posting target must remain enabled/i)
    ).toBeVisible();
    await expect(personalCheckbox).toBeChecked();
    expect(putSent).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Compose form — per-post LinkedIn destinations
// ---------------------------------------------------------------------------

test.describe('Compose — LinkedIn posting-target selection', () => {
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

  test('LinkedIn toggle is hidden when every posting target is disabled', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);
    await stubPostingTargets(page, [
      personalTarget(false),
      orgPageTarget('page-a', 'Acme Page', false),
    ]);

    await page.goto('/dashboard');
    await openPostingOptions(page);

    // Other cross-post controls render, but LinkedIn does not.
    await expect(
      page.getByRole('button', { name: /Cross-post to LinkedIn/i })
    ).not.toBeVisible();
  });

  test('destination list shows only enabled targets with personal checked by default', async ({
    page,
  }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);
    await stubPostingTargets(page, [
      personalTarget(true),
      orgPageTarget('page-a', 'Acme Page', true),
      orgPageTarget('page-b', 'Beta Page', false),
    ]);

    await page.goto('/dashboard');
    await openPostingOptions(page);
    await page.getByRole('button', { name: /Cross-post to LinkedIn/i }).click();

    await expect(page.getByText('LinkedIn destinations')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Test Person (personal)' })
    ).toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: 'Acme Page (page)' })
    ).not.toBeChecked();
    // Disabled targets are excluded from the per-post list entirely.
    await expect(page.getByRole('checkbox', { name: 'Beta Page (page)' })).not.toBeVisible();
  });

  test('first enabled org page is the default when personal is disabled', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);
    await stubPostingTargets(page, [
      personalTarget(false),
      orgPageTarget('page-a', 'Acme Page', true),
      orgPageTarget('page-b', 'Beta Page', true),
    ]);

    await page.goto('/dashboard');
    await openPostingOptions(page);
    await page.getByRole('button', { name: /Cross-post to LinkedIn/i }).click();

    await expect(page.getByText('LinkedIn destinations')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Test Person (personal)' })
    ).not.toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Acme Page (page)' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Beta Page (page)' })).not.toBeChecked();
  });

  test('submitting with multiple destinations sends linkedInTargets to /api/messages', async ({
    page,
  }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);
    await stubPostingTargets(page, [
      personalTarget(true),
      orgPageTarget('page-a', 'Acme Page', true),
    ]);

    let capturedBody: Record<string, unknown> | null = null;
    await page.route('/api/messages', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      capturedBody = JSON.parse(route.request().postData() ?? '{}');
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-li-targets-1',
          content: capturedBody?.content ?? '',
          crossPostResults: [
            {
              providerId: 'linkedin',
              instanceName: 'LinkedIn',
              success: true,
              url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:456/',
            },
          ],
        }),
      });
    });
    await page.goto('/dashboard');
    await openPostingOptions(page);
    await page.getByRole('button', { name: /Cross-post to LinkedIn/i }).click();

    // Personal is selected by default; also select the org page.
    await page.getByRole('checkbox', { name: 'Acme Page (page)' }).check();
    await expect(page.getByRole('checkbox', { name: 'Test Person (personal)' })).toBeChecked();

    // Summary reflects both destinations.
    await expect(page.getByText(/Posting to:.*LinkedIn.*Test Person.*Acme Page/i)).toBeVisible();

    await page.getByPlaceholder("What's on your mind?").fill('Multi-target LinkedIn post');
    await page.getByRole('button', { name: 'Post Message' }).click();

    await expect(page.getByPlaceholder("What's on your mind?")).toHaveValue('', {
      timeout: 5000,
    });

    expect(capturedBody).not.toBeNull();
    const captured = capturedBody as unknown as Record<string, unknown>;
    expect(captured.crossPostToLinkedIn).toBe(true);
    expect(captured.linkedInTargets).toEqual([
      { kind: 'personal' },
      { kind: 'orgPage', pageId: 'page-a' },
    ]);
  });
});
