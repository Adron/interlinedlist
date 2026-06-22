// Integrations page — UI regression
//
// Page: /integrations
//
// Coverage
//  1. Unauthenticated visit redirects to /login.
//  2. Authenticated user sees the heading and the Back-to-Settings link.
//  3. Each provider card is present: GitHub, Bluesky, LinkedIn, Mastodon,
//     Twitter / X.
//  4. When no identities are linked, the GitHub/Bluesky cards show a
//     Connect entry point (anchor) whose href points at the provider's
//     server-side authorize route — we assert the href, never click it.
//  5. LinkedIn / Twitter cards show a connect entry point (live link or
//     Coming-soon placeholder) depending on whether the /api/auth/*/status
//     endpoint reports the provider as configured. We stub both status
//     endpoints so the cards are deterministic.
//  6. The error= and success= query params surface inline alerts.
//  7. The Generative AI section renders alongside the Connected Accounts
//     section.
//
// Strategy
// Real OAuth handshakes are never exercised. We only assert that the entry
// points exist and point at the expected server URLs. The Mastodon "Add
// instance" button is rendered without navigation in the test (we don't click
// the underlying redirect).

import { expect, test, type Page } from '@playwright/test';
import { loginAs, TEST_USER } from './helpers/auth';

async function stubProviderStatus(page: Page) {
  await page.route('/api/auth/linkedin/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ configured: true }),
    })
  );
  await page.route('/api/auth/twitter/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ configured: true }),
    })
  );
  // The ConnectedAccountsSection also fetches posting targets; stub to empty
  // so the LinkedIn card renders without depending on real identities.
  await page.route('/api/linkedin/posting-targets', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ targets: [] }),
      });
    } else {
      route.fallback();
    }
  });
}

test.describe('Integrations page', () => {
  test('unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto('/integrations');
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated user sees heading and back link', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await stubProviderStatus(page);
    await page.goto('/integrations');

    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to Settings/i })).toHaveAttribute(
      'href',
      '/settings'
    );
  });

  test('all provider cards are rendered', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await stubProviderStatus(page);
    await page.goto('/integrations');

    // Provider badges identify each card uniquely
    await expect(page.getByText('GitHub', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Bluesky', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('LinkedIn', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Mastodon', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Twitter / X', { exact: true }).first()).toBeVisible();
  });

  test('GitHub Connect link points at the authorize route', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await stubProviderStatus(page);
    await page.goto('/integrations');

    // Assert the connect link href without clicking — clicking would 302 to GitHub.
    const githubConnect = page.getByRole('link', { name: 'Connect' }).first();
    await expect(githubConnect).toBeVisible();
    await expect(githubConnect).toHaveAttribute(
      'href',
      /\/api\/auth\/github\/authorize/
    );
  });

  test('LinkedIn Connect link is present when /api/auth/linkedin/status reports configured', async ({
    page,
  }) => {
    await loginAs(page, TEST_USER);
    await stubProviderStatus(page);
    await page.goto('/integrations');

    // Wait for the status poll to complete (the connect anchor only appears
    // once the client knows the provider is configured).
    const liConnect = page.locator('a[href*="/api/auth/linkedin/authorize"]');
    await expect(liConnect.first()).toBeVisible();
  });

  test('Twitter Connect link is present when /api/auth/twitter/status reports configured', async ({
    page,
  }) => {
    await loginAs(page, TEST_USER);
    await stubProviderStatus(page);
    await page.goto('/integrations');

    const twConnect = page.locator('a[href*="/api/auth/twitter/authorize"]');
    await expect(twConnect.first()).toBeVisible();
  });

  test('Mastodon "Add instance" entry point is present', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await stubProviderStatus(page);
    await page.goto('/integrations');

    await expect(
      page.getByRole('button', { name: /Add Mastodon instance/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder('mastodon.social')).toBeVisible();
  });

  test('Bluesky Connect link uses bluesky authorize route', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await stubProviderStatus(page);
    await page.goto('/integrations');

    const bsConnect = page.locator('a[href*="/api/auth/bluesky/authorize"]');
    await expect(bsConnect.first()).toBeVisible();
  });

  test('error query param renders inline alert', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await stubProviderStatus(page);
    await page.goto('/integrations?error=Connection%20expired');

    await expect(page.locator('.alert-danger')).toContainText('Connection expired');
  });

  test('success query param renders inline alert', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await stubProviderStatus(page);
    await page.goto('/integrations?success=Connected');

    await expect(page.locator('.alert-success')).toContainText('Connected');
  });

  test('Generative AI section renders next to Connected Accounts', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await stubProviderStatus(page);
    await page.goto('/integrations');

    // The GenerativeAISection card mentions OpenAI/Anthropic
    await expect(page.getByText(/OpenAI/i).first()).toBeVisible();
    await expect(page.getByText(/Anthropic/i).first()).toBeVisible();
  });
});
