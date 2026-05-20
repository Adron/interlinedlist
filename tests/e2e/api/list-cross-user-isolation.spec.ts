import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// Verify that a list owned by User A cannot be read, modified, or deleted
// by User B — the Prisma queries must include `userId: user.id` in every WHERE clause.
// The app intentionally returns 404 instead of 403 to avoid ID enumeration.
test.describe('List API — cross-user data isolation (IDOR prevention)', () => {
  let subscriberListId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const res = await page.request.post('/api/lists', {
      data: { title: 'Isolation Test List', isPublic: false },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    subscriberListId = body.data.id;

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

  test('User B cannot GET User A list', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.get(`/api/lists/${subscriberListId}`);
    expect(res.status()).toBe(404);

    await ctx.close();
  });

  test('User B cannot PUT (update) User A list', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.put(`/api/lists/${subscriberListId}`, {
      data: { title: 'Hijacked Title' },
    });
    expect(res.status()).toBe(404);

    await ctx.close();
  });

  test('User B cannot DELETE User A list', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.delete(`/api/lists/${subscriberListId}`);
    expect(res.status()).toBe(404);

    await ctx.close();
  });

  test('User B cannot GET data rows from User A list', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.get(`/api/lists/${subscriberListId}/data`);
    expect(res.status()).toBe(404);

    await ctx.close();
  });

  test('User B cannot POST data rows into User A list', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.post(`/api/lists/${subscriberListId}/data`, {
      data: { data: { note: 'injected' } },
    });
    expect(res.status()).toBe(404);

    await ctx.close();
  });

  test('User B cannot GET schema of User A list', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.get(`/api/lists/${subscriberListId}/schema`);
    expect(res.status()).toBe(404);

    await ctx.close();
  });

  test('User B cannot GET watchers of User A list', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.get(`/api/lists/${subscriberListId}/watchers`);
    expect(res.status()).toBe(404);

    await ctx.close();
  });
});
