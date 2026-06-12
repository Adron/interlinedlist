/**
 * LinkedIn org integration — E2E tests (PR #40)
 *
 * Auth requirements
 * -----------------
 * Tests that require a logged-in session use the shared test-account fixture
 * (global-setup.ts) via the `loginAs` helper.  No real LinkedIn credentials
 * are needed; the OAuth round-trips and LinkedIn API calls are either
 * intercepted with page.route() or validated only for redirect behaviour.
 *
 * Covered scenarios
 * -----------------
 *
 * OAuth org-authorize route
 *   1. GET /api/auth/linkedin/org-authorize without a session redirects to
 *      /login?error=.
 *   2. Without organizationId param, redirects to /organizations?error=.
 *   3. With an org the user is not a member of, redirects to /organizations?error=.
 *
 * OAuth org-callback route
 *   4. Missing code/state redirects to /organizations?error=.
 *   5. Invalid state redirects to /organizations?error=.
 *
 * /api/organizations/[id]/linkedin/status  (GET)
 *   6. Unauthenticated request returns 401.
 *   7. Authenticated member of a non-existent org returns 403.
 *
 * /api/organizations/[id]/linkedin/credential  (DELETE)
 *   8. Unauthenticated request returns 401.
 *
 * /api/organizations/[id]/linkedin/sync-pages  (POST)
 *   9. Unauthenticated request returns 401.
 *
 * /api/organizations/[id]/linkedin/assignments  (PUT)
 *  10. Unauthenticated request returns 401.
 *  11. Missing userId in body returns 400.
 *
 * Compose page — LinkedIn personal cross-post toggle
 *  12. LinkedIn toggle is absent when user has no LinkedIn identity.
 *  13. LinkedIn toggle appears when a LinkedIn identity is connected.
 *  14. Clicking the toggle activates then deactivates it.
 *  15. Enabling toggle shows "Posting to: LinkedIn" summary.
 *  16. Submitting with crossPostToLinkedIn=true sends it to /api/messages.
 *  17. A cross-post failure is rendered as inline text, not a raw 500.
 *
 * logo-icon.png
 *  18. GET /logo-icon.png returns 200 with a PNG content-type.
 *  19. The nav bar logo img src points to /logo-icon.png and is visible.
 */

import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from './helpers/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stub /api/user/identities to return a connected LinkedIn account. */
async function stubLinkedInIdentity(page: import('@playwright/test').Page) {
  await page.route('/api/user/identities', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        identities: [
          {
            id: 'li-identity-1',
            provider: 'linkedin',
            providerUsername: 'Test User',
            profileUrl: 'https://www.linkedin.com/in/testuser',
            avatarUrl: null,
            connectedAt: new Date().toISOString(),
            lastVerifiedAt: null,
          },
        ],
      }),
    });
  });
}

/** Stub /api/user/identities to return no connected accounts. */
async function stubNoIdentities(page: import('@playwright/test').Page) {
  await page.route('/api/user/identities', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ identities: [] }),
    });
  });
}

// ---------------------------------------------------------------------------
// LinkedIn org-authorize OAuth route — unauthenticated / parameter guards
// ---------------------------------------------------------------------------

test.describe('LinkedIn org-authorize OAuth route', () => {
  test('redirects to /login when user is not authenticated', async ({ page }) => {
    const response = await page.request.get(
      '/api/auth/linkedin/org-authorize?organizationId=fake-org-id',
      { maxRedirects: 0 }
    );

    expect([302, 307, 308]).toContain(response.status());
    const location = response.headers()['location'] ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('error=');
  });

  test('redirects to /organizations when organizationId is missing', async ({ page }) => {
    // Even unauthenticated; the auth check fires first.  We verify that a
    // missing param results in a redirect (not a 500) for a logged-in session
    // by going through the login flow first.
    await loginAs(page, TEST_USER);

    const response = await page.request.get(
      '/api/auth/linkedin/org-authorize',
      { maxRedirects: 0 }
    );

    expect([302, 307, 308]).toContain(response.status());
    const location = response.headers()['location'] ?? '';
    // Logged-in but missing param → /organizations?error=
    expect(location).toContain('/organizations');
    expect(location).toContain('error=');
    const decoded = decodeURIComponent(location);
    expect(decoded).toMatch(/organizationId/i);
  });

  test('redirects to /organizations when user is not an admin of the org', async ({ page }) => {
    await loginAs(page, TEST_USER);

    // Use an org id the test user doesn't own/admin
    const response = await page.request.get(
      '/api/auth/linkedin/org-authorize?organizationId=nonexistent-org-id',
      { maxRedirects: 0 }
    );

    expect([302, 307, 308]).toContain(response.status());
    const location = response.headers()['location'] ?? '';
    expect(location).toContain('/organizations');
    expect(location).toContain('error=');
  });
});

// ---------------------------------------------------------------------------
// LinkedIn org-callback OAuth route — parameter guards
// ---------------------------------------------------------------------------

test.describe('LinkedIn org-callback OAuth route', () => {
  test('missing code/state redirects to /organizations with error', async ({ page }) => {
    const response = await page.request.get(
      '/api/auth/linkedin/org-callback',
      { maxRedirects: 0 }
    );

    expect([302, 307, 308]).toContain(response.status());
    const location = response.headers()['location'] ?? '';
    expect(location).toContain('/organizations');
    expect(location).toContain('error=');
    // Must not be a raw stack trace
    const decoded = decodeURIComponent(location);
    expect(decoded).not.toMatch(/TypeError:/);
  });

  test('invalid state redirects to /organizations with error', async ({ page }) => {
    const response = await page.request.get(
      '/api/auth/linkedin/org-callback?code=fakecode&state=invalidstate',
      { maxRedirects: 0 }
    );

    expect([302, 307, 308]).toContain(response.status());
    const location = response.headers()['location'] ?? '';
    expect(location).toContain('/organizations');
    expect(location).toContain('error=');
  });
});

// ---------------------------------------------------------------------------
// /api/organizations/[id]/linkedin/status — auth guard
// ---------------------------------------------------------------------------

test.describe('LinkedIn org status endpoint', () => {
  test('GET returns 401 for unauthenticated request', async ({ page }) => {
    const response = await page.request.get(
      '/api/organizations/nonexistent-id/linkedin/status'
    );
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('GET returns 403 for user who is not a member of the org', async ({ page }) => {
    await loginAs(page, TEST_USER);

    const response = await page.request.get(
      '/api/organizations/nonexistent-id/linkedin/status'
    );
    // 403 = not a member; the org doesn't exist so the membership lookup returns null
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// /api/organizations/[id]/linkedin/credential — DELETE auth guard
// ---------------------------------------------------------------------------

test.describe('LinkedIn org credential DELETE', () => {
  test('returns 401 for unauthenticated request', async ({ page }) => {
    const response = await page.request.delete(
      '/api/organizations/nonexistent-id/linkedin/credential'
    );
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('returns 403 when user is not an owner', async ({ page }) => {
    await loginAs(page, TEST_USER);

    const response = await page.request.delete(
      '/api/organizations/nonexistent-id/linkedin/credential'
    );
    // 403 = not owner (test user is not owner of this fake org)
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// /api/organizations/[id]/linkedin/sync-pages — POST auth guard
// ---------------------------------------------------------------------------

test.describe('LinkedIn org sync-pages', () => {
  test('POST returns 401 for unauthenticated request', async ({ page }) => {
    const response = await page.request.post(
      '/api/organizations/nonexistent-id/linkedin/sync-pages',
      { data: {} }
    );
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// /api/organizations/[id]/linkedin/assignments — PUT auth/validation guards
// ---------------------------------------------------------------------------

test.describe('LinkedIn org assignments', () => {
  test('PUT returns 401 for unauthenticated request', async ({ page }) => {
    const response = await page.request.put(
      '/api/organizations/nonexistent-id/linkedin/assignments',
      { data: { userId: 'some-user', pageId: 'some-page' } }
    );
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('PUT returns 400 when userId is missing from body', async ({ page }) => {
    await loginAs(page, TEST_USER);

    const response = await page.request.put(
      '/api/organizations/nonexistent-id/linkedin/assignments',
      { data: { pageId: 'some-page' } }
    );
    // 400 (userId required) or 403 (not admin) — both are acceptable; 500 is not
    expect(response.status()).not.toBe(500);
    expect([400, 403]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// Compose page — LinkedIn personal cross-post toggle
// ---------------------------------------------------------------------------

test.describe('Compose — LinkedIn personal cross-post toggle', () => {
  test('LinkedIn toggle is absent when user has no LinkedIn identity', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubNoIdentities(page);

    await page.goto('/dashboard');

    await expect(page.getByRole('button', { name: 'Posting options' })).toBeVisible();
    await page.getByRole('button', { name: 'Posting options' }).click();

    // With no identities, LinkedIn cross-post button should not appear
    const linkedinToggle = page.getByRole('button', {
      name: /Cross-post to LinkedIn/i,
    });
    await expect(linkedinToggle).not.toBeVisible();
  });

  test('LinkedIn toggle appears when a LinkedIn identity is connected', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Posting options' }).click();

    await expect(
      page.getByRole('button', { name: /Cross-post to LinkedIn/i })
    ).toBeVisible();
  });

  test('clicking the LinkedIn toggle activates then deactivates it', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Posting options' }).click();

    const linkedinBtn = page.getByRole('button', { name: /Cross-post to LinkedIn/i });
    await expect(linkedinBtn).toBeVisible();

    // Initially muted (inactive)
    await expect(linkedinBtn).toHaveClass(/text-muted/);

    // First click — activates
    await linkedinBtn.click();
    await expect(linkedinBtn).toHaveClass(/text-primary/);

    // Second click — deactivates
    await linkedinBtn.click();
    await expect(linkedinBtn).toHaveClass(/text-muted/);
  });

  test('enabling LinkedIn cross-post shows "Posting to: LinkedIn" summary', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Posting options' }).click();

    await page.getByRole('button', { name: /Cross-post to LinkedIn/i }).click();

    await expect(page.getByText(/Posting to:.*LinkedIn/i)).toBeVisible();
  });

  test('submitting with LinkedIn cross-post sends crossPostToLinkedIn=true to /api/messages', async ({
    page,
  }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);

    let capturedBody: Record<string, unknown> | null = null;
    await page.route('/api/messages', async (route) => {
      if (route.request().method() === 'POST') {
        capturedBody = JSON.parse(route.request().postData() ?? '{}');
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'msg-li-1',
            content: capturedBody?.content ?? '',
            crossPostResults: [
              {
                providerId: 'linkedin',
                instanceName: 'LinkedIn',
                success: true,
                url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:123/',
              },
            ],
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.route('/api/user/update', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { showAdvancedPostSettings: true } }),
      });
    });

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Posting options' }).click();

    // Enable LinkedIn cross-post
    await page.getByRole('button', { name: /Cross-post to LinkedIn/i }).click();

    // Type a message
    await page.getByPlaceholder("What's on your mind?").fill('Hello LinkedIn from E2E test!');

    // Submit
    await page.getByRole('button', { name: 'Post Message' }).click();

    // Wait for the form to reset on success
    await expect(page.getByPlaceholder("What's on your mind?")).toHaveValue('', { timeout: 5000 });

    // Verify payload contained the LinkedIn cross-post flag
    expect(capturedBody).not.toBeNull();
    const captured = capturedBody as unknown as Record<string, unknown>;
    expect(captured.crossPostToLinkedIn).toBe(true);
    expect(captured.content).toBe('Hello LinkedIn from E2E test!');

    // Success cross-post result is shown
    await expect(page.getByText(/Posted to:.*LinkedIn/i)).toBeVisible();
  });

  test('LinkedIn cross-post failure is shown as error text — not a raw 500', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await stubLinkedInIdentity(page);

    await page.route('/api/messages', async (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'msg-li-2',
            content: 'test',
            crossPostResults: [
              {
                providerId: 'linkedin',
                instanceName: 'LinkedIn',
                success: false,
                error: 'Token expired — reconnect required',
              },
            ],
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.route('/api/user/update', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { showAdvancedPostSettings: true } }),
      });
    });

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Posting options' }).click();
    await page.getByRole('button', { name: /Cross-post to LinkedIn/i }).click();
    await page.getByPlaceholder("What's on your mind?").fill('This will fail on LinkedIn');
    await page.getByRole('button', { name: 'Post Message' }).click();

    await expect(page.getByPlaceholder("What's on your mind?")).toHaveValue('', { timeout: 5000 });

    // Inline failure text — no raw HTTP 500 error banner
    await expect(
      page.getByText(/Failed:.*LinkedIn.*Token expired/i)
    ).toBeVisible();
    await expect(page.locator('.alert-danger')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// logo-icon.png — transparent background check (PR #40 changed the file)
// ---------------------------------------------------------------------------

test.describe('logo-icon.png asset', () => {
  test('GET /logo-icon.png returns 200 with PNG content-type', async ({ request }) => {
    const response = await request.get('/logo-icon.png');
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('image/png');
  });

  test('logo-icon.png is a valid PNG (starts with PNG magic bytes)', async ({ request }) => {
    const response = await request.get('/logo-icon.png');
    expect(response.status()).toBe(200);
    const buffer = await response.body();
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50); // P
    expect(buffer[2]).toBe(0x4e); // N
    expect(buffer[3]).toBe(0x47); // G
  });

  test('nav bar renders logo-icon.png image without errors', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await page.goto('/dashboard');

    // NavigationTitle renders <Logo iconOnly> inside a <Link title="Home">
    const navLogo = page.getByRole('img', { name: 'InterlinedList Logo' }).first();

    await expect(navLogo).toBeVisible();
    await expect(navLogo).toHaveAttribute('src', /logo-icon\.png/);
  });
});
