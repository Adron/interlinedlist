import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// Watcher management routes are owner-only.
// A non-owner authenticated user must receive 403 or 404 on all write operations
// and must not be able to escalate their own role.
test.describe('Watcher API — owner-only enforcement and role-escalation prevention', () => {
  let publicListId: string;
  let testUserId: string;

  test.beforeAll(async ({ browser }) => {
    // Create a public list as subscriber (owner = subscriber)
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await loginAs(pageA, TEST_SUBSCRIBER);

    const createRes = await pageA.request.post('/api/lists', {
      data: { title: 'Public Watcher Test List', isPublic: true },
    });
    expect(createRes.status()).toBe(201);
    publicListId = (await createRes.json()).data.id;

    await ctxA.close();

    // Fetch testuser's ID so we can target the watcher/:userId routes
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await loginAs(pageB, TEST_USER);

    const meRes = await pageB.request.get('/api/lists'); // any authenticated endpoint works to confirm session
    expect(meRes.status()).toBe(200);

    // Add TEST_USER as a watcher on the list (owner grants it) to get a watcher record to manipulate
    await ctxB.close();

    const ctxOwner = await browser.newContext();
    const pageOwner = await ctxOwner.newPage();
    await loginAs(pageOwner, TEST_SUBSCRIBER);

    // Look up testuser's id via the watchers/users search
    const usersRes = await pageOwner.request.get(
      `/api/lists/${publicListId}/watchers/users?search=testuser`
    );
    if (usersRes.ok()) {
      const body = await usersRes.json();
      if (body.users?.length > 0) {
        testUserId = body.users[0].id;
        // Pre-add testuser as watcher so we have a record for PUT/DELETE tests
        await pageOwner.request.post(`/api/lists/${publicListId}/watchers`, {
          data: { userId: testUserId, role: 'watcher' },
        });
      }
    }

    await ctxOwner.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!publicListId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await page.request.delete(`/api/lists/${publicListId}`);
    await ctx.close();
  });

  test('non-owner cannot GET list watchers', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    // TEST_USER is not the owner — list belongs to subscriber
    const res = await page.request.get(`/api/lists/${publicListId}/watchers`);
    // Returns 404 (owner check uses `userId: user.id` in WHERE)
    expect(res.status()).toBe(404);

    await ctx.close();
  });

  test('non-owner cannot add another user as watcher', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.post(`/api/lists/${publicListId}/watchers`, {
      data: { userId: 'some-other-user-id', role: 'manager' },
    });
    expect(res.status()).toBe(403);

    await ctx.close();
  });

  test('non-owner cannot search for users to add as watchers', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.get(
      `/api/lists/${publicListId}/watchers/users?search=test`
    );
    expect(res.status()).toBe(404);

    await ctx.close();
  });

  test('non-owner cannot escalate a watcher role via PUT', async ({ browser }) => {
    if (!testUserId) {
      test.skip();
      return;
    }
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    // TEST_USER tries to promote themselves (or anyone) on a list they don't own
    const res = await page.request.put(
      `/api/lists/${publicListId}/watchers/${testUserId}`,
      { data: { role: 'manager' } }
    );
    expect(res.status()).toBe(404);

    await ctx.close();
  });

  test('non-owner cannot remove a watcher via DELETE', async ({ browser }) => {
    if (!testUserId) {
      test.skip();
      return;
    }
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.delete(
      `/api/lists/${publicListId}/watchers/${testUserId}`
    );
    expect(res.status()).toBe(404);

    await ctx.close();
  });
});
