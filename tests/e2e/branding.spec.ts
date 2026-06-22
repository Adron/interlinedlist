import { expect, test } from '@playwright/test';

/**
 * Branding regression tests — PR #38
 *
 * Covers:
 * 1. Nav bar and footer both render the logo icon mark (logo-icon.png) via an
 *    <img> with alt "InterlinedList Logo".
 * 2. The /help/branding page renders — specifically the "Primary Logo Mark"
 *    heading that was added in this PR.
 * 3. The SVG wordmark files served from /brand/svg/ include Ocean Blue
 *    (rgb(15,76,95)) and Emerald Green (rgb(52,165,109)) fill colours.
 *
 * Bluesky OAuth is a separate flow handled by the unit-testing agent and
 * requires credentials — skipped here.
 */

test.describe('Logo icon mark in nav bar and footer', () => {
  test('nav bar contains the logo icon image', async ({ page }) => {
    await page.goto('/');

    // The Logo component (iconOnly=true) renders an <img alt="InterlinedList Logo">
    // that points at /logo-icon.png.  The nav bar wraps it in a link whose
    // accessible name is the current page title (e.g. "InterlinedList" on /).
    // Scope the locator to the topbar so we don't collide with the footer logo.
    const topbar = page.locator('header.app-topbar');
    const navLogo = topbar.getByRole('img', { name: 'InterlinedList Logo' });

    await expect(navLogo).toBeVisible();
    await expect(navLogo).toHaveAttribute('src', /logo-icon\.png/);
  });

  test('footer contains the logo icon image', async ({ page }) => {
    await page.goto('/');

    // The footer renders Logo size="small" iconOnly={true} outside any <a> tag,
    // so we locate the footer element first and then find the img within it.
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const footerLogo = footer.getByRole('img', { name: 'InterlinedList Logo' });
    await expect(footerLogo).toBeVisible();
    await expect(footerLogo).toHaveAttribute('src', /logo-icon\.png/);
  });
});

test.describe('Help branding page', () => {
  test('renders the Branding & Style Guide page', async ({ page }) => {
    await page.goto('/help/branding');

    // Page heading from the markdown front-matter title
    await expect(page.getByRole('heading', { name: 'Branding & Style Guide' })).toBeVisible();
  });

  test('shows the Primary Logo Mark section added in PR #38', async ({ page }) => {
    await page.goto('/help/branding');

    // The markdown has two headings containing "Primary Logo Mark"
    // (one in "## Logo Previews" and one in "## Logo Assets").
    // We verify at least one is present.
    await expect(
      page.getByRole('heading', { name: /Primary [Ll]ogo [Mm]ark/ }).first(),
    ).toBeVisible();
  });

  test('includes the canonical logo-only.png image in the preview section', async ({ page }) => {
    await page.goto('/help/branding');

    // The markdown renders an <img> whose src points at the icon-dark-transparent-256.png
    // (used as the canonical logo mark preview).
    await expect(
      page.getByRole('img', { name: /InterlinedList primary logo mark/i }),
    ).toBeVisible();
  });
});

test.describe('SVG wordmark files served from /brand/svg/', () => {
  // These tests fetch the SVG content directly and assert the brand colours
  // are present, confirming the grey-to-brand-colour fix in PR #38.

  test('logo-dark.svg contains Ocean Blue fill', async ({ request }) => {
    const response = await request.get('/brand/svg/logo-dark.svg');
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    // Ocean Blue: rgb(15,76,95) or #0F4C5F
    expect(body).toMatch(/rgb\(15,76,95\)|#0[Ff]4[Cc]5[Ff]/);
  });

  test('logo-dark.svg contains Emerald Green fill', async ({ request }) => {
    const response = await request.get('/brand/svg/logo-dark.svg');
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    // Emerald Green: rgb(52,165,109) or #34A56D
    expect(body).toMatch(/rgb\(52,165,109\)|#34[Aa]56[Dd]/);
  });

  test('logo-light.svg contains Ocean Blue fill', async ({ request }) => {
    const response = await request.get('/brand/svg/logo-light.svg');
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body).toMatch(/rgb\(15,76,95\)|#0[Ff]4[Cc]5[Ff]/);
  });

  test('logo-light.svg contains Emerald Green fill', async ({ request }) => {
    const response = await request.get('/brand/svg/logo-light.svg');
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body).toMatch(/rgb\(52,165,109\)|#34[Aa]56[Dd]/);
  });

  test('logo-dark.svg does not use gray for text (old colour)', async ({ request }) => {
    const response = await request.get('/brand/svg/logo-dark.svg');
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    // The old incorrect fill was a gray tone like #808080 / rgb(128,128,128).
    // After the fix, neither of those should appear as fill values.
    expect(body).not.toMatch(/fill="#808080"|fill="rgb\(128,128,128\)"/);
  });
});
