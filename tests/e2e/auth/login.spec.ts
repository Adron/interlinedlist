import { expect, test } from '@playwright/test';
import { TEST_USER } from '../helpers/auth';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders login form', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('wrong password shows error alert', async ({ page }) => {
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('.alert-danger')).toContainText('Invalid email or password');
  });

  test('unknown email shows error alert', async ({ page }) => {
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('whatever123');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('.alert-danger')).toContainText('Invalid email or password');
  });

  test('already-authenticated visit redirects away from login', async ({ page }) => {
    // Log in via API to set the session cookie
    const response = await page.request.post('/api/auth/login', {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });
    expect(response.ok()).toBeTruthy();

    await page.goto('/login');
    await expect(page).toHaveURL('/dashboard');
  });
});
