import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// POST /api/lists checks isSubscriber(user.customerStatus).
// Free-tier users must receive 403 with a human-readable subscription prompt.
// Subscriber-tier users must be allowed through (201).
test.describe('List creation — subscription gate enforcement', () => {
  test('free-tier user cannot create a list (403)', async ({ page }) => {
    await loginAs(page, TEST_USER);

    const res = await page.request.post('/api/lists', {
      data: { title: 'Should Be Blocked' },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Subscribe');
  });

  test('unauthenticated request cannot create a list (401)', async ({ page }) => {
    const res = await page.request.post('/api/lists', {
      data: { title: 'No Session' },
    });

    expect(res.status()).toBe(401);
  });

  test('subscriber-tier user can create a list (201)', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);

    const res = await page.request.post('/api/lists', {
      data: { title: `Subscription Gate Test ${Date.now()}` },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBeTruthy();

    // Clean up
    await page.request.delete(`/api/lists/${body.data.id}`);
  });

  test('free-tier user cannot bypass gate by manipulating request body', async ({ page }) => {
    await loginAs(page, TEST_USER);

    // Attempt to pass customerStatus in body — server must ignore it
    const res = await page.request.post('/api/lists', {
      data: {
        title: 'Bypass Attempt',
        customerStatus: 'subscriber',
        isSubscriber: true,
      },
    });

    expect(res.status()).toBe(403);
  });
});
