import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------
test.describe('List search — unauthenticated returns 401', () => {
  test('GET /api/lists/search without session returns 401', async ({ page }) => {
    const res = await page.request.get('/api/lists/search?q=anything');
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Missing / empty query parameter
// ---------------------------------------------------------------------------
test.describe('List search — missing query parameter returns 400', () => {
  test('GET /api/lists/search without q returns 400', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get('/api/lists/search');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/q.*required/i);
  });

  test('GET /api/lists/search?q= (empty string) returns 400', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get('/api/lists/search?q=');
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Happy-path search: create a list, search for it, delete it
// ---------------------------------------------------------------------------
test.describe('List search — returns matching lists with itemCount', () => {
  let listId: string;
  const uniqueToken = `e2e-list-search-${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const res = await page.request.post('/api/lists', {
      data: { title: `Search Target ${uniqueToken}` },
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

  test('search by title token returns the matching list', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(
      `/api/lists/search?q=${encodeURIComponent(uniqueToken)}`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.lists)).toBe(true);
    const found = body.lists.find((l: { id: string }) => l.id === listId);
    expect(found).toBeTruthy();
  });

  test('each result includes id, title, isPublic, and itemCount', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(
      `/api/lists/search?q=${encodeURIComponent(uniqueToken)}`
    );
    const body = await res.json();
    const list = body.lists.find((l: { id: string }) => l.id === listId);
    expect(list).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      isPublic: expect.any(Boolean),
      itemCount: expect.any(Number),
    });
  });

  test('response does not expose raw _count field', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(
      `/api/lists/search?q=${encodeURIComponent(uniqueToken)}`
    );
    const body = await res.json();
    const list = body.lists.find((l: { id: string }) => l.id === listId);
    expect(list).not.toHaveProperty('_count');
  });

  test('response includes pagination with total, limit, offset, hasMore', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(
      `/api/lists/search?q=${encodeURIComponent(uniqueToken)}`
    );
    const body = await res.json();
    expect(body.pagination).toMatchObject({
      total: expect.any(Number),
      limit: expect.any(Number),
      offset: expect.any(Number),
      hasMore: expect.any(Boolean),
    });
  });

  test('search for a non-existent token returns empty lists array', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(
      '/api/lists/search?q=zzz_no_match_token_xyz_789'
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.lists).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
    expect(body.pagination.hasMore).toBe(false);
  });

  test('search does not return lists owned by a different user', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const res = await page.request.get(
      `/api/lists/search?q=${encodeURIComponent(uniqueToken)}`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    const leaked = body.lists.find((l: { id: string }) => l.id === listId);
    expect(leaked).toBeUndefined();
  });
});
