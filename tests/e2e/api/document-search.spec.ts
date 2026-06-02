import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------
test.describe('Document search — unauthenticated returns 401', () => {
  test('GET /api/documents/search without session returns 401', async ({ page }) => {
    const res = await page.request.get('/api/documents/search?q=anything');
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Missing / empty query parameter
// ---------------------------------------------------------------------------
test.describe('Document search — missing query parameter returns 400', () => {
  test('GET /api/documents/search without q returns 400', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get('/api/documents/search');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/q.*required/i);
  });

  test('GET /api/documents/search?q= (empty) returns 400', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get('/api/documents/search?q=');
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Happy-path search: create a document, find it, delete it
// ---------------------------------------------------------------------------
test.describe('Document search — returns matching documents', () => {
  let documentId: string;
  const uniqueToken = `e2e-doc-search-${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const res = await page.request.post('/api/documents', {
      data: { title: `Search Target ${uniqueToken}`, content: '' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    documentId = body.document.id;

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!documentId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await page.request.delete(`/api/documents/${documentId}`);
    await ctx.close();
  });

  test('search by title token returns the matching document', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(
      `/api/documents/search?q=${encodeURIComponent(uniqueToken)}`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.documents)).toBe(true);
    const found = body.documents.find((d: { id: string }) => d.id === documentId);
    expect(found).toBeTruthy();
  });

  test('search result documents have id, title, folderId, updatedAt fields', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(
      `/api/documents/search?q=${encodeURIComponent(uniqueToken)}`
    );
    const body = await res.json();
    const doc = body.documents.find((d: { id: string }) => d.id === documentId);
    expect(doc).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect('folderId' in doc).toBe(true);
  });

  test('response includes pagination object with total, limit, offset, hasMore', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(
      `/api/documents/search?q=${encodeURIComponent(uniqueToken)}`
    );
    const body = await res.json();
    expect(body.pagination).toMatchObject({
      total: expect.any(Number),
      limit: expect.any(Number),
      offset: expect.any(Number),
      hasMore: expect.any(Boolean),
    });
  });

  test('search for a non-existent token returns empty documents array', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get(
      '/api/documents/search?q=zzz_no_match_token_xyz_789'
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.documents).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
    expect(body.pagination.hasMore).toBe(false);
  });

  test('free-tier user can also search their own documents (200)', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const res = await page.request.get('/api/documents/search?q=anything');
    // Search is read-only; no subscription gate expected
    expect(res.status()).toBe(200);
  });

  test('search does not return documents owned by another user', async ({ page }) => {
    // Log in as TEST_USER and search for the subscriber's unique token
    await loginAs(page, TEST_USER);
    const res = await page.request.get(
      `/api/documents/search?q=${encodeURIComponent(uniqueToken)}`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    const leaked = body.documents.find((d: { id: string }) => d.id === documentId);
    expect(leaked).toBeUndefined();
  });
});
