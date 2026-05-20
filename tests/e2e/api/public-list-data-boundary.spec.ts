import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER } from '../helpers/auth';

// GET /api/users/:username/lists is unauthenticated — it returns public lists only.
// Security properties:
// - Private lists must never appear in the response regardless of caller auth state.
// - Mismatched username/listId combinations must return 404.
// - Public lists appear correctly.
test.describe('Public list boundary — private lists not exposed via unauthenticated endpoint', () => {
  let privateListId: string;
  let publicListId: string;
  const SUBSCRIBER_USERNAME = 'testsubscriber';

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const [privRes, pubRes] = await Promise.all([
      page.request.post('/api/lists', {
        data: { title: 'Private Boundary Test', isPublic: false },
      }),
      page.request.post('/api/lists', {
        data: { title: 'Public Boundary Test', isPublic: true },
      }),
    ]);
    expect(privRes.status()).toBe(201);
    expect(pubRes.status()).toBe(201);

    privateListId = (await privRes.json()).data.id;
    publicListId = (await pubRes.json()).data.id;

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    await Promise.all([
      page.request.delete(`/api/lists/${privateListId}`),
      page.request.delete(`/api/lists/${publicListId}`),
    ]);

    await ctx.close();
  });

  test('anonymous GET /api/users/:username/lists does not include private list', async ({
    page,
  }) => {
    const res = await page.request.get(`/api/users/${SUBSCRIBER_USERNAME}/lists`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const ids = (body.lists ?? body.data ?? []).map((l: { id: string }) => l.id);
    expect(ids).not.toContain(privateListId);
  });

  test('anonymous GET /api/users/:username/lists includes public list', async ({ page }) => {
    const res = await page.request.get(`/api/users/${SUBSCRIBER_USERNAME}/lists`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const ids = (body.lists ?? body.data ?? []).map((l: { id: string }) => l.id);
    expect(ids).toContain(publicListId);
  });

  test('GET /api/users/unknownuser/lists returns 404', async ({ page }) => {
    const res = await page.request.get('/api/users/thisuserdoesnotexist_xyz123/lists');
    expect(res.status()).toBe(404);
  });
});
