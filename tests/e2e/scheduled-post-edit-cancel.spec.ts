// Scheduled posts — edit / cancel UI regression
//
// Page: /dashboard/scheduled
//
// Coverage
//  1. Unauthenticated visit redirects to /login.
//  2. Authenticated user sees the Queue / Calendar tabs and the date-range
//     filter buttons.
//  3. A user-created scheduled post appears in the Queue list.
//  4. Clicking the edit button opens the EditScheduledModal with the schedule
//     datetime pre-filled.
//  5. Saving a new datetime PATCHes the message and the card updates with the
//     new value.
//  6. Closing the modal without saving leaves the card unchanged.
//  7. Cancelling a scheduled post (DELETE /api/messages/:id) removes it from
//     the queue. The current UI has no inline Cancel button, so the cancel
//     side of this contract is exercised via the API + page reload.
//
// Auth note
// Uses TEST_SUBSCRIBER because scheduled posting is a subscriber-tier feature
// in some deployments. Messages are created over /api/messages with a
// scheduledAt timestamp in the future.

import { expect, test, type Page } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER } from './helpers/auth';

function inFuture(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function createScheduledMessage(page: Page, content: string, scheduledAt: string): Promise<string> {
  const res = await page.request.post('/api/messages', {
    data: {
      content,
      publiclyVisible: false,
      scheduledAt,
    },
  });
  expect(res.ok(), `Schedule create failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return body.id ?? body.message?.id ?? body.data?.id;
}

async function deleteMessage(page: Page, id: string): Promise<void> {
  if (!id) return;
  await page.request.delete(`/api/messages/${id}`).catch(() => {});
}

test.describe('Scheduled posts page — /dashboard/scheduled', () => {
  test('unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/scheduled');
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated user sees Queue and Calendar tabs with range filters', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await page.goto('/dashboard/scheduled');

    await expect(page.getByRole('tab', { name: 'Queue' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Calendar' })).toBeVisible();
    await expect(page.getByLabel('Today')).toBeVisible();
    await expect(page.getByLabel('This week')).toBeVisible();
    await expect(page.getByLabel('This month')).toBeVisible();
  });

  test('a scheduled post appears in the Queue', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const content = `E2E scheduled post ${Date.now()}`;
    const messageId = await createScheduledMessage(page, content, inFuture(60));

    try {
      await page.goto('/dashboard/scheduled');
      // Month is the default range; no need to click.

      // The card truncates content > 120 chars but our content is short
      await expect(page.getByText(content)).toBeVisible();
    } finally {
      await deleteMessage(page, messageId);
      await ctx.close();
    }
  });

  test('clicking edit opens the modal with the scheduled time pre-filled', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const content = `E2E edit-modal ${Date.now()}`;
    const messageId = await createScheduledMessage(page, content, inFuture(120));

    try {
      await page.goto('/dashboard/scheduled');
      await expect(page.getByText(content)).toBeVisible();

      // There may be multiple cards; scope to the row containing our content
      const card = page.locator('.card', { hasText: content });
      await card.getByRole('button', { name: 'Edit scheduled post' }).click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Edit scheduled post' })).toBeVisible();
      const dtInput = page.locator('input[type="datetime-local"]');
      await expect(dtInput).toBeVisible();
      const value = await dtInput.inputValue();
      expect(value).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    } finally {
      await deleteMessage(page, messageId);
      await ctx.close();
    }
  });

  test('saving a new datetime updates the scheduled post', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const content = `E2E reschedule ${Date.now()}`;
    const messageId = await createScheduledMessage(page, content, inFuture(60));

    try {
      await page.goto('/dashboard/scheduled');
      await expect(page.getByText(content)).toBeVisible();

      const card = page.locator('.card', { hasText: content });
      await card.getByRole('button', { name: 'Edit scheduled post' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Push the schedule out by ~3 hours
      const newTime = new Date(Date.now() + 3 * 60 * 60_000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatted = `${newTime.getFullYear()}-${pad(newTime.getMonth() + 1)}-${pad(newTime.getDate())}T${pad(newTime.getHours())}:${pad(newTime.getMinutes())}`;

      const dtInput = page.locator('input[type="datetime-local"]');
      await dtInput.fill(formatted);
      await page.getByRole('button', { name: 'Save' }).click();

      // Modal closes on success
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // The card refreshes — confirm by re-fetching via API and checking
      // scheduledAt advanced.
      const after = await page.request.get(`/api/messages/scheduled?range=month`);
      expect(after.ok()).toBeTruthy();
      const body = await after.json();
      const found = (body.messages as Array<{ id: string; scheduledAt: string }>).find(
        (m) => m.id === messageId
      );
      expect(found).toBeTruthy();
      const newScheduledAt = new Date(found!.scheduledAt).getTime();
      expect(newScheduledAt).toBeGreaterThan(Date.now() + 2 * 60 * 60_000);
    } finally {
      await deleteMessage(page, messageId);
      await ctx.close();
    }
  });

  test('closing the modal without saving keeps the original schedule', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const originalIso = inFuture(45);
    const content = `E2E modal-cancel ${Date.now()}`;
    const messageId = await createScheduledMessage(page, content, originalIso);

    try {
      await page.goto('/dashboard/scheduled');
      await expect(page.getByText(content)).toBeVisible();

      const card = page.locator('.card', { hasText: content });
      await card.getByRole('button', { name: 'Edit scheduled post' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Hit Cancel in the modal — note: this only closes the dialog
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // Verify the scheduledAt did not change
      const after = await page.request.get('/api/messages/scheduled?range=month');
      const body = await after.json();
      const found = (body.messages as Array<{ id: string; scheduledAt: string }>).find(
        (m) => m.id === messageId
      );
      expect(found).toBeTruthy();
      expect(new Date(found!.scheduledAt).toISOString()).toBe(new Date(originalIso).toISOString());
    } finally {
      await deleteMessage(page, messageId);
      await ctx.close();
    }
  });

  test('cancelling (deleting) a scheduled post removes it from the queue', async ({
    browser,
  }) => {
    // The current /dashboard/scheduled UI does not expose an inline cancel
    // button on the card.  This test still locks in the contract that
    // DELETE /api/messages/:id removes the row from the queue, which is the
    // user-visible "cancel scheduled post" outcome.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const content = `E2E cancel-via-api ${Date.now()}`;
    const messageId = await createScheduledMessage(page, content, inFuture(90));

    try {
      await page.goto('/dashboard/scheduled');
      await expect(page.getByText(content)).toBeVisible();

      const del = await page.request.delete(`/api/messages/${messageId}`);
      expect(del.ok()).toBeTruthy();

      await page.reload();
      // Month is still selected after reload.
      await expect(page.getByText(content)).toHaveCount(0);
    } finally {
      await deleteMessage(page, messageId);
      await ctx.close();
    }
  });
});
