import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// POST /api/lists/connections verifies the caller owns BOTH lists before creating a connection.
// DELETE /api/lists/connections/:id also verifies both-list ownership.
// A user must not be able to forge a connection involving another user's list.
test.describe('List connections — cross-user ownership enforcement', () => {
  let listAId: string;
  let listBId: string;
  let connectionId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const [resA, resB] = await Promise.all([
      page.request.post('/api/lists', { data: { title: 'Connection Test A' } }),
      page.request.post('/api/lists', { data: { title: 'Connection Test B' } }),
    ]);
    expect(resA.status()).toBe(201);
    expect(resB.status()).toBe(201);

    listAId = (await resA.json()).data.id;
    listBId = (await resB.json()).data.id;

    // Create a legitimate connection between subscriber's own lists
    const connRes = await page.request.post('/api/lists/connections', {
      data: { fromListId: listAId, toListId: listBId },
    });
    expect(connRes.status()).toBe(201);
    connectionId = (await connRes.json()).id;

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    if (connectionId) {
      await page.request.delete(`/api/lists/connections/${connectionId}`);
    }
    if (listAId) await page.request.delete(`/api/lists/${listAId}`);
    if (listBId) await page.request.delete(`/api/lists/${listBId}`);

    await ctx.close();
  });

  test('User B cannot create a connection using User A lists (403)', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.post('/api/lists/connections', {
      data: { fromListId: listAId, toListId: listBId },
    });
    expect(res.status()).toBe(403);

    await ctx.close();
  });

  test('User B cannot delete User A connection (403 or 404)', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.delete(`/api/lists/connections/${connectionId}`);
    // Server returns 403 when the connection exists but caller doesn't own both lists
    expect([403, 404]).toContain(res.status());

    await ctx.close();
  });

  test("User B's GET /api/lists/connections does not include User A's connections", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const res = await page.request.get('/api/lists/connections');
    expect(res.status()).toBe(200);
    const body = await res.json();

    const ids = (body.connections ?? []).map((c: { id: string }) => c.id);
    expect(ids).not.toContain(connectionId);

    await ctx.close();
  });
});
