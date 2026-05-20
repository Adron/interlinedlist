import { expect, test } from '@playwright/test';
import { TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// CLI sync tokens provide a second authentication path (Bearer token).
// Security properties:
// - Valid credentials → token issued; token authenticates subsequent API calls.
// - Invalid credentials → 401; no token issued.
// - Forged/random token → 401 on protected routes.
// - Token is scoped to the issuing user; cross-user data must remain isolated.
test.describe('Sync-token (Bearer) authentication', () => {
  test('valid credentials return a sync token', async ({ page }) => {
    const res = await page.request.post('/api/auth/sync-token', {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(10);
  });

  test('wrong password returns 401 on token endpoint', async ({ page }) => {
    const res = await page.request.post('/api/auth/sync-token', {
      data: { email: TEST_USER.email, password: 'completely-wrong-password' },
    });
    expect(res.status()).toBe(401);
  });

  test('unknown email returns 401 on token endpoint', async ({ page }) => {
    const res = await page.request.post('/api/auth/sync-token', {
      data: { email: 'nobody@nowhere.example.com', password: 'irrelevant' },
    });
    expect(res.status()).toBe(401);
  });

  test('missing credentials return 400 on token endpoint', async ({ page }) => {
    const res = await page.request.post('/api/auth/sync-token', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('valid Bearer token authenticates GET /api/lists', async ({ page }) => {
    const tokenRes = await page.request.post('/api/auth/sync-token', {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });
    const { token } = await tokenRes.json();

    const listsRes = await page.request.get('/api/lists', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listsRes.status()).toBe(200);
  });

  test('forged Bearer token returns 401', async ({ page }) => {
    const res = await page.request.get('/api/lists', {
      headers: { Authorization: 'Bearer totally-fake-token-not-in-database' },
    });
    expect(res.status()).toBe(401);
  });

  test('malformed Authorization header returns 401', async ({ page }) => {
    const res = await page.request.get('/api/lists', {
      headers: { Authorization: 'NotBearer sometoken' },
    });
    expect(res.status()).toBe(401);
  });

  test("User A's token cannot access User B's private list", async ({ browser }) => {
    // Get a token for TEST_USER
    const userCtx = await browser.newContext();
    const userPage = await userCtx.newPage();

    const tokenRes = await userPage.request.post('/api/auth/sync-token', {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });
    const { token } = await tokenRes.json();

    // Create a private list as subscriber
    const subCtx = await browser.newContext();
    const subPage = await subCtx.newPage();
    await subPage.request.post('/api/auth/login', {
      data: { email: TEST_SUBSCRIBER.email, password: TEST_SUBSCRIBER.password },
    });
    const createRes = await subPage.request.post('/api/lists', {
      data: { title: 'Sync Token Isolation Test', isPublic: false },
    });
    expect(createRes.status()).toBe(201);
    const privateListId = (await createRes.json()).data.id;

    // Attempt to read subscriber's private list using TEST_USER's Bearer token (no cookies)
    const readRes = await userPage.request.get(`/api/lists/${privateListId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(readRes.status()).toBe(404);

    // Clean up
    await subPage.request.delete(`/api/lists/${privateListId}`);
    await subCtx.close();
    await userCtx.close();
  });
});
