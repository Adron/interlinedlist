import { expect, test } from '@playwright/test';

test.describe('Forgot password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('renders forgot password form', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible();
  });

  test('submitting a valid email shows success message', async ({ page }) => {
    await page.getByLabel('Email').fill('anyone@example.com');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    // The API always returns success to prevent email enumeration
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test('success state shows a Back to Login link', async ({ page }) => {
    await page.getByLabel('Email').fill('anyone@example.com');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible();
  });
});
