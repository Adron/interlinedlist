import { expect, test } from '@playwright/test';

// All list API endpoints must reject unauthenticated requests with 401.
// The middleware skips /api routes, so each handler is solely responsible for auth.
test.describe('List API — unauthenticated access returns 401', () => {
  const FAKE_ID = '00000000-0000-0000-0000-000000000001';

  test('GET /api/lists returns 401', async ({ page }) => {
    const res = await page.request.get('/api/lists');
    expect(res.status()).toBe(401);
  });

  test('POST /api/lists returns 401', async ({ page }) => {
    const res = await page.request.post('/api/lists', {
      data: { title: 'Unauthorized list' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/lists/:id returns 401', async ({ page }) => {
    const res = await page.request.get(`/api/lists/${FAKE_ID}`);
    expect(res.status()).toBe(401);
  });

  test('PUT /api/lists/:id returns 401', async ({ page }) => {
    const res = await page.request.put(`/api/lists/${FAKE_ID}`, {
      data: { title: 'Updated' },
    });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/lists/:id returns 401', async ({ page }) => {
    const res = await page.request.delete(`/api/lists/${FAKE_ID}`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/lists/:id/data returns 401', async ({ page }) => {
    const res = await page.request.get(`/api/lists/${FAKE_ID}/data`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/lists/:id/data returns 401', async ({ page }) => {
    const res = await page.request.post(`/api/lists/${FAKE_ID}/data`, {
      data: { data: {} },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/lists/:id/schema returns 401', async ({ page }) => {
    const res = await page.request.get(`/api/lists/${FAKE_ID}/schema`);
    expect(res.status()).toBe(401);
  });

  test('PUT /api/lists/:id/schema returns 401', async ({ page }) => {
    const res = await page.request.put(`/api/lists/${FAKE_ID}/schema`, {
      data: { schema: '' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/lists/:id/watchers returns 401', async ({ page }) => {
    const res = await page.request.get(`/api/lists/${FAKE_ID}/watchers`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/lists/:id/watchers returns 401', async ({ page }) => {
    const res = await page.request.post(`/api/lists/${FAKE_ID}/watchers`, {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/lists/:id/watchers/me returns 401', async ({ page }) => {
    const res = await page.request.get(`/api/lists/${FAKE_ID}/watchers/me`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/lists/connections returns 401', async ({ page }) => {
    const res = await page.request.get('/api/lists/connections');
    expect(res.status()).toBe(401);
  });

  test('POST /api/lists/connections returns 401', async ({ page }) => {
    const res = await page.request.post('/api/lists/connections', {
      data: { fromListId: FAKE_ID, toListId: FAKE_ID },
    });
    expect(res.status()).toBe(401);
  });
});
