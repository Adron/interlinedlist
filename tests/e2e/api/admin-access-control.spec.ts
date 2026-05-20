import { expect, test } from '@playwright/test';
import { loginAs, TEST_USER } from '../helpers/auth';

// Admin routes require the caller to be both in the Administrator table
// AND owner of "The Public" organization (checkAdminAndPublicOwner).
// Regular authenticated users must receive 403; unauthenticated callers too.
test.describe('Admin API — privilege boundary enforcement', () => {
  test('unauthenticated GET /api/admin/users returns 403', async ({ page }) => {
    const res = await page.request.get('/api/admin/users');
    expect(res.status()).toBe(403);
  });

  test('unauthenticated POST /api/admin/users returns 403', async ({ page }) => {
    const res = await page.request.post('/api/admin/users', {
      data: {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('regular user GET /api/admin/users returns 403', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const res = await page.request.get('/api/admin/users');
    expect(res.status()).toBe(403);
  });

  test('regular user POST /api/admin/users returns 403', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const res = await page.request.post('/api/admin/users', {
      data: {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('regular user cannot set isAdministrator via admin route', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const res = await page.request.post('/api/admin/users', {
      data: {
        email: 'escalated@example.com',
        username: 'escalateduser',
        password: 'password123',
        isAdministrator: true,
        customerStatus: 'subscriber',
      },
    });
    // Must be blocked before the payload is ever processed
    expect(res.status()).toBe(403);
  });

  test('regular user PUT /api/admin/users/:id returns 403', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const FAKE_ID = '00000000-0000-0000-0000-000000000001';
    const res = await page.request.put(`/api/admin/users/${FAKE_ID}`, {
      data: { customerStatus: 'subscriber' },
    });
    expect(res.status()).toBe(403);
  });

  test('regular user DELETE /api/admin/users/:id returns 403', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const FAKE_ID = '00000000-0000-0000-0000-000000000001';
    const res = await page.request.delete(`/api/admin/users/${FAKE_ID}`);
    expect(res.status()).toBe(403);
  });
});
