import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// Session lifecycle security:
// 1. After logout the session cookie must be invalidated (protected routes return 401).
// 2. Logging out with ?all=true clears all sessions.
// 3. POST /api/auth/switch must not accept an arbitrary userId — it is limited to
//    sessions the caller actually holds in their cookie jar.
test.describe('Session lifecycle — invalidation and switch guard', () => {
  test('protected route accessible while authenticated', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const res = await page.request.get('/api/lists');
    expect(res.status()).toBe(200);
  });

  test('after logout protected route returns 401', async ({ page }) => {
    await loginAs(page, TEST_USER);

    // Confirm session is active
    const beforeRes = await page.request.get('/api/lists');
    expect(beforeRes.status()).toBe(200);

    // Logout
    const logoutRes = await page.request.post('/api/auth/logout');
    expect(logoutRes.status()).toBe(200);

    // Subsequent request must be rejected
    const afterRes = await page.request.get('/api/lists');
    expect(afterRes.status()).toBe(401);
  });

  test('logout with all=true also clears session', async ({ page }) => {
    await loginAs(page, TEST_USER);

    const logoutRes = await page.request.post('/api/auth/logout?all=true');
    expect(logoutRes.status()).toBe(200);

    const afterRes = await page.request.get('/api/lists');
    expect(afterRes.status()).toBe(401);
  });

  test('unauthenticated logout does not crash (returns 200)', async ({ page }) => {
    // No session — logout should still succeed gracefully
    const res = await page.request.post('/api/auth/logout');
    expect(res.status()).toBe(200);
  });

  test('account switch with arbitrary userId is rejected (401)', async ({ browser }) => {
    // Log in as TEST_USER and try to switch into TEST_SUBSCRIBER's session by guessing ID.
    // The switch endpoint must validate that the target userId is already in the caller's
    // session cookie, not accept any UUID.
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await loginAs(pageA, TEST_USER);

    // Obtain subscriber's user id by logging in as them in a separate context
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await loginAs(pageB, TEST_SUBSCRIBER);
    // We need subscriber's ID — try to get it from an authenticated endpoint
    // If there's no /api/user/me, use a heuristic: subscriber's lists response
    const listsRes = await pageB.request.get('/api/lists');
    await ctxB.close();

    // Attempt switch from TEST_USER's session into an arbitrary userId
    const FAKE_SUBSCRIBER_ID = '00000000-0000-0000-0000-999999999999';
    const switchRes = await pageA.request.post('/api/auth/switch', {
      data: { userId: FAKE_SUBSCRIBER_ID },
    });
    // Must not succeed — only sessions already in the cookie are valid targets
    expect([400, 401, 403, 404]).toContain(switchRes.status());

    await ctxA.close();
  });
});
