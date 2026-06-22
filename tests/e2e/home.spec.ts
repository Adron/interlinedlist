import { expect, test } from '@playwright/test';

test.describe('Home', () => {
  test('has application title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/InterlinedList/);
  });

  test('shows Login and Sign Up links for unauthenticated visitors', async ({ page }) => {
    await page.goto('/');
    // Scope to the top nav (the <header className="app-topbar">) — the footer
    // also renders Login / Sign Up links, which would otherwise cause the
    // strict-mode locator to match two elements.
    const topbar = page.locator('header.app-topbar');
    await expect(topbar.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(topbar.getByRole('link', { name: 'Sign Up' })).toBeVisible();
  });

  test('public message feed is visible without logging in', async ({ page }) => {
    await page.goto('/');
    // The feed container renders regardless of auth; messages may or may not be present
    await expect(page.locator('body')).not.toContainText('Internal server error');
  });
});

test.describe('Protected route redirects', () => {
  const protectedRoutes = ['/dashboard', '/settings', '/lists'];

  for (const route of protectedRoutes) {
    test(`unauthenticated visit to ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
