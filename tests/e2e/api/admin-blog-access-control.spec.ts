import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// The DB-backed blog CMS admin API is gated by checkAdminAndPublicOwner():
// the caller must be BOTH in the Administrator table AND owner of "The Public"
// organization. Every gate failure returns 403 { error: 'Forbidden' } — this
// fires before any request body is parsed or any post is looked up, so a fake
// UUID is sufficient for the [id] routes.
//
// Neither the free nor the subscriber seed user is an administrator, so both
// must be rejected. The critical property: these routes never leak (no 200)
// and never crash (no 500) for unauthorized callers.
test.describe('Admin blog API — privilege boundary enforcement', () => {
  const FAKE_ID = '00000000-0000-0000-0000-000000000001';

  test.describe('unauthenticated callers are Forbidden (403)', () => {
    test('GET /api/admin/blog returns 403', async ({ page }) => {
      const res = await page.request.get('/api/admin/blog');
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe('Forbidden');
    });

    test('POST /api/admin/blog returns 403', async ({ page }) => {
      const res = await page.request.post('/api/admin/blog', {
        data: { title: 'Unauthorized draft', published: true },
      });
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe('Forbidden');
    });

    test('GET /api/admin/blog/:id returns 403', async ({ page }) => {
      const res = await page.request.get(`/api/admin/blog/${FAKE_ID}`);
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe('Forbidden');
    });

    test('PATCH /api/admin/blog/:id returns 403', async ({ page }) => {
      const res = await page.request.patch(`/api/admin/blog/${FAKE_ID}`, {
        data: { published: true },
      });
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe('Forbidden');
    });

    test('DELETE /api/admin/blog/:id returns 403', async ({ page }) => {
      const res = await page.request.delete(`/api/admin/blog/${FAKE_ID}`);
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe('Forbidden');
    });
  });

  // Both seed users (free + subscriber) are non-admins. Subscription tier must
  // NOT be conflated with admin access, so the subscriber is rejected too.
  for (const account of [
    { label: 'free-tier user', creds: TEST_USER },
    { label: 'subscriber-tier user', creds: TEST_SUBSCRIBER },
  ]) {
    test.describe(`authenticated non-admin (${account.label}) is Forbidden (403)`, () => {
      test.beforeEach(async ({ page }) => {
        await loginAs(page, account.creds);
      });

      test('GET /api/admin/blog returns 403', async ({ page }) => {
        const res = await page.request.get('/api/admin/blog');
        expect(res.status()).toBe(403);
        expect((await res.json()).error).toBe('Forbidden');
      });

      test('POST /api/admin/blog returns 403 (cannot create a post)', async ({ page }) => {
        const res = await page.request.post('/api/admin/blog', {
          data: { title: `Non-admin draft ${Date.now()}`, published: true },
        });
        // Must be blocked before the body is ever processed.
        expect(res.status()).toBe(403);
        expect((await res.json()).error).toBe('Forbidden');
      });

      test('GET /api/admin/blog/:id returns 403', async ({ page }) => {
        const res = await page.request.get(`/api/admin/blog/${FAKE_ID}`);
        expect(res.status()).toBe(403);
        expect((await res.json()).error).toBe('Forbidden');
      });

      test('PATCH /api/admin/blog/:id returns 403', async ({ page }) => {
        const res = await page.request.patch(`/api/admin/blog/${FAKE_ID}`, {
          data: { published: false },
        });
        expect(res.status()).toBe(403);
        expect((await res.json()).error).toBe('Forbidden');
      });

      test('DELETE /api/admin/blog/:id returns 403', async ({ page }) => {
        const res = await page.request.delete(`/api/admin/blog/${FAKE_ID}`);
        expect(res.status()).toBe(403);
        expect((await res.json()).error).toBe('Forbidden');
      });
    });
  }
});
