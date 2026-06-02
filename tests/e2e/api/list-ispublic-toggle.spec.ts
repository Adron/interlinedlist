import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// ---------------------------------------------------------------------------
// PUT /api/lists/[id] — isPublic field toggles list visibility
// ---------------------------------------------------------------------------

test.describe('List isPublic toggle — PUT /api/lists/:id', () => {
  let listId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const res = await page.request.post('/api/lists', {
      data: { title: `Toggle Public Test ${Date.now()}`, isPublic: false },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    listId = body.data.id;

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!listId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await page.request.delete(`/api/lists/${listId}`);
    await ctx.close();
  });

  test('PUT with isPublic:true sets the list public (200)', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(`/api/lists/${listId}`, {
      data: { isPublic: true },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.isPublic).toBe(true);
  });

  test('GET /api/lists/:id reflects the updated isPublic value', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(`/api/lists/${listId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.isPublic).toBe(true);
  });

  test('PUT with isPublic:false sets the list private (200)', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(`/api/lists/${listId}`, {
      data: { isPublic: false },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.isPublic).toBe(false);
  });

  test('GET /api/lists/:id reflects the updated private state', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(`/api/lists/${listId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.isPublic).toBe(false);
  });

  test('isPublic is coerced: truthy string is not accepted as true', async ({ page }) => {
    // The route does `isPublic === true` so only a boolean true sets it
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(`/api/lists/${listId}`, {
      data: { isPublic: 'yes' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // 'yes' !== true, so the route sets isPublic = false
    expect(body.data.isPublic).toBe(false);
  });

  test('PUT without isPublic field leaves visibility unchanged', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    // First set to true
    await page.request.put(`/api/lists/${listId}`, { data: { isPublic: true } });

    // Update only the title — isPublic must remain true
    const res = await page.request.put(`/api/lists/${listId}`, {
      data: { title: `Updated Title ${Date.now()}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.isPublic).toBe(true);
  });

  test('PUT /api/lists/:id returns 401 without session', async ({ page }) => {
    const res = await page.request.put(`/api/lists/${listId}`, {
      data: { isPublic: true },
    });
    expect(res.status()).toBe(401);
  });

  test('PUT /api/lists/:id returns 404 for non-existent list', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(
      '/api/lists/00000000-0000-0000-0000-000000000099',
      { data: { isPublic: true } }
    );
    expect(res.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Cross-user isolation
// ---------------------------------------------------------------------------
test.describe('List isPublic toggle — cross-user isolation', () => {
  let subscriberListId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const res = await page.request.post('/api/lists', {
      data: { title: `Isolation Toggle Test ${Date.now()}`, isPublic: false },
    });
    expect(res.status()).toBe(201);
    subscriberListId = (await res.json()).data.id;

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!subscriberListId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await page.request.delete(`/api/lists/${subscriberListId}`);
    await ctx.close();
  });

  test('TEST_USER cannot toggle isPublic on TEST_SUBSCRIBER list (404)', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const res = await page.request.put(`/api/lists/${subscriberListId}`, {
      data: { isPublic: true },
    });
    expect(res.status()).toBe(404);
  });
});
