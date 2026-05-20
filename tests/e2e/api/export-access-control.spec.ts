import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// Export endpoints stream CSV with all of the authenticated user's data.
// Security properties:
// - Unauthenticated requests must return 401 (not a CSV dump).
// - Authenticated user receives only their own rows; no cross-user leakage.
test.describe('Export API — access control and data scoping', () => {
  test('unauthenticated GET /api/exports/lists returns 401', async ({ page }) => {
    const res = await page.request.get('/api/exports/lists');
    expect(res.status()).toBe(401);
  });

  test('unauthenticated GET /api/exports/list-data-rows returns 401', async ({ page }) => {
    const res = await page.request.get('/api/exports/list-data-rows');
    expect(res.status()).toBe(401);
  });

  test('authenticated GET /api/exports/lists returns CSV content', async ({ page }) => {
    await loginAs(page, TEST_USER);

    const res = await page.request.get('/api/exports/lists');
    expect(res.status()).toBe(200);

    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/csv');
  });

  test("subscriber's exported CSV does not contain testuser's list IDs", async ({ browser }) => {
    // Create a list as TEST_USER to have something to verify isolation against.
    // TEST_USER is free-tier and can't create lists, so we verify indirectly:
    // the subscriber's export should only reference subscriber-owned list IDs.

    const ctxSub = await browser.newContext();
    const pageSub = await ctxSub.newPage();
    await loginAs(pageSub, TEST_SUBSCRIBER);

    // Create a list for subscriber so CSV is non-empty
    const createRes = await pageSub.request.post('/api/lists', {
      data: { title: `Export Isolation Test ${Date.now()}` },
    });
    expect(createRes.status()).toBe(201);
    const subListId = (await createRes.json()).data.id;

    // Fetch subscriber's own list IDs via the regular API
    const allListsRes = await pageSub.request.get('/api/lists');
    const allListsBody = await allListsRes.json();
    const subscriberListIds: string[] = (allListsBody.lists ?? allListsBody.data ?? []).map(
      (l: { id: string }) => l.id
    );

    // Get the CSV
    const exportRes = await pageSub.request.get('/api/exports/lists');
    expect(exportRes.status()).toBe(200);
    const csv = await exportRes.text();

    // Every ID in the CSV must belong to the subscriber
    const csvLines = csv.split('\n').slice(1).filter(Boolean); // skip header
    for (const line of csvLines) {
      const id = line.split(',')[0];
      if (id) {
        expect(subscriberListIds).toContain(id);
      }
    }

    // Clean up
    await pageSub.request.delete(`/api/lists/${subListId}`);
    await ctxSub.close();
  });

  test('Bearer-token-only callers receive 401 on export (session-cookie required)', async ({
    page,
  }) => {
    // Export routes use getCurrentUser() (session-cookie only), not getCurrentUserOrSyncToken().
    // A valid Bearer token must not grant access to exports.
    const tokenRes = await page.request.post('/api/auth/sync-token', {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });
    const { token } = await tokenRes.json();

    const exportRes = await page.request.get('/api/exports/lists', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(exportRes.status()).toBe(401);
  });
});
