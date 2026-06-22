// Dig and Reply flows — UI regression
//
// Surface: the public message feed on / (MessageList → MessageCard renders
// Dig + Reply controls). The dashboard's MessageTable does NOT render
// MessageCard, so the home feed is the correct UI surface.
//
// Coverage
//  Dig
//   1. Logged-in user clicks "I Dig!" on their own (publicly visible)
//      message — the count increments by 1 and the button switches to a
//      pressed state (aria-pressed=true).
//   2. Clicking again removes the dig: count decrements, aria-pressed=false.
//   3. Logged-out viewers see the "Sign in to dig" link instead of an active
//      button.
//
//  Reply
//   4. Clicking the "Reply" button opens the inline reply composer.
//   5. The "Reply" button toggles to "Cancel" once the composer is open.
//   6. Submitting a reply causes the new reply to appear in the thread below
//      the parent (without a full page reload).
//
// Auth note
// Test fixtures: TEST_USER posts a public message and reacts to / replies to
// their own message. We can't trust which messages already exist in the dev
// feed, so each test creates its own seed message via /api/messages and
// scopes selectors to the resulting card.

import { expect, test, type Page } from '@playwright/test';
import { loginAs, TEST_USER } from './helpers/auth';

async function createMessage(page: Page, content: string): Promise<string> {
  const res = await page.request.post('/api/messages', {
    data: { content, publiclyVisible: true },
  });
  expect(res.ok(), `Message create failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return body.id ?? body.message?.id ?? body.data?.id;
}

async function deleteMessage(page: Page, id: string): Promise<void> {
  if (!id) return;
  await page.request.delete(`/api/messages/${id}`).catch(() => {});
}

test.describe('Dig reaction — public feed', () => {
  test('clicking I Dig! activates the button and increments the count', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const content = `E2E dig ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const messageId = await createMessage(page, content);

    try {
      await page.goto('/');

      // Locate the card that contains our content.
      const card = page.locator('.card', { hasText: content }).first();
      await expect(card).toBeVisible();

      const digBtn = card.getByRole('button', { name: /Mark this message as something you dig/i });
      await expect(digBtn).toBeVisible();
      await expect(digBtn).toHaveAttribute('aria-pressed', 'false');

      await digBtn.click();
      // After click, aria-pressed flips and the label changes to remove-flavour
      const pressedBtn = card.getByRole('button', { name: /Remove your dig from this message/i });
      await expect(pressedBtn).toBeVisible();
      await expect(pressedBtn).toHaveAttribute('aria-pressed', 'true');
      // Count is now 1, included in the label
      await expect(pressedBtn).toHaveAccessibleName(/1 total/);
    } finally {
      await deleteMessage(page, messageId);
      await ctx.close();
    }
  });

  test('clicking the dig button a second time removes the dig', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const content = `E2E undig ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const messageId = await createMessage(page, content);

    try {
      await page.goto('/');
      const card = page.locator('.card', { hasText: content }).first();
      await expect(card).toBeVisible();

      const initialBtn = card.getByRole('button', { name: /Mark this message as something you dig/i });
      await initialBtn.click();
      const pressedBtn = card.getByRole('button', { name: /Remove your dig from this message/i });
      await expect(pressedBtn).toBeVisible();

      await pressedBtn.click();
      const unpressedBtn = card.getByRole('button', { name: /Mark this message as something you dig/i });
      await expect(unpressedBtn).toBeVisible();
      await expect(unpressedBtn).toHaveAttribute('aria-pressed', 'false');
      // Count is now 0 again
      await expect(unpressedBtn).toHaveAccessibleName(/0 digs/);
    } finally {
      await deleteMessage(page, messageId);
      await ctx.close();
    }
  });

  test('logged-out visitors see "Sign in to dig" instead of a clickable Dig button', async ({
    browser,
  }) => {
    // First the subscriber-or-free user posts a public message.
    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    await loginAs(ownerPage, TEST_USER);

    const content = `E2E dig-anon ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const messageId = await createMessage(ownerPage, content);

    try {
      const anonCtx = await browser.newContext();
      const anonPage = await anonCtx.newPage();
      await anonPage.goto('/');

      const card = anonPage.locator('.card', { hasText: content }).first();
      await expect(card).toBeVisible();

      // The signed-out version renders a "Sign in to dig" link, not a Dig button
      await expect(card.getByRole('link', { name: /Sign in to dig/i })).toBeVisible();
      await expect(
        card.getByRole('button', { name: /Mark this message as something you dig/i })
      ).toHaveCount(0);

      await anonCtx.close();
    } finally {
      await deleteMessage(ownerPage, messageId);
      await ownerCtx.close();
    }
  });
});

test.describe('Reply composer — public feed', () => {
  test('clicking Reply opens the inline composer; clicking again cancels', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const content = `E2E reply-toggle ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const messageId = await createMessage(page, content);

    try {
      await page.goto('/');
      const card = page.locator('.card', { hasText: content }).first();
      await expect(card).toBeVisible();

      // The card's Reply button has aria-label "Reply to this message"
      const replyBtn = card.getByRole('button', { name: 'Reply to this message' });
      await expect(replyBtn).toBeVisible();
      await replyBtn.click();

      // Composer textarea becomes visible
      await expect(page.getByPlaceholder('Write a reply...').first()).toBeVisible();

      // Button label flips to "Cancel reply"
      const cancelBtn = card.getByRole('button', { name: 'Cancel reply' });
      await expect(cancelBtn).toBeVisible();
      await cancelBtn.click();

      await expect(page.getByPlaceholder('Write a reply...')).toHaveCount(0);
    } finally {
      await deleteMessage(page, messageId);
      await ctx.close();
    }
  });

  test('submitting a reply shows the new reply below the parent', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USER);

    const parentContent = `E2E reply-parent ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const replyContent = `E2E reply-body ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const parentId = await createMessage(page, parentContent);

    try {
      await page.goto('/');
      const card = page.locator('.card', { hasText: parentContent }).first();
      await expect(card).toBeVisible();

      await card.getByRole('button', { name: 'Reply to this message' }).click();

      const textarea = page.getByPlaceholder('Write a reply...').first();
      await expect(textarea).toBeVisible();
      await textarea.fill(replyContent);

      // The submit button inside the form is labeled "Reply" (and enabled
      // once content is non-empty).  Scope by the form ancestor to avoid the
      // parent card's own Reply trigger.
      const submitBtn = page.getByRole('button', { name: 'Reply', exact: true }).last();
      await submitBtn.click();

      // The new reply renders below the parent
      await expect(page.getByText(replyContent)).toBeVisible({ timeout: 10_000 });
    } finally {
      // Clean up: deleting the parent should cascade replies in this app, but
      // be defensive — find and remove any leftover replies first.
      await deleteMessage(page, parentId);
      await ctx.close();
    }
  });
});
