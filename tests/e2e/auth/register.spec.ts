import { expect, test } from '@playwright/test';

// Use a unique suffix per run so repeated local runs don't collide on username/email
const RUN_ID = Date.now();

test.describe('Register', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('renders registration form', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('successful registration redirects to dashboard', async ({ page }) => {
    await page.getByLabel('Email').fill(`e2e_new_${RUN_ID}@example.com`);
    await page.getByLabel('Username').fill(`e2enew${RUN_ID}`);
    await page.getByLabel('Password').fill('securepassword1');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('duplicate email shows error alert', async ({ page }) => {
    // Use an account that is guaranteed to exist (seeded free user)
    const existingEmail = process.env.TEST_USER_EMAIL ?? 'testuser@example.com';
    await page.getByLabel('Email').fill(existingEmail);
    await page.getByLabel('Username').fill(`unique_user_${RUN_ID}`);
    await page.getByLabel('Password').fill('securepassword1');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.locator('.alert-danger')).toContainText('already exists');
  });

  test('API rejects password shorter than 8 characters', async ({ page }) => {
    // Chromium suppresses form submission for very short passwords without a minlength
    // attribute, so we verify the server-side constraint directly via the API.
    const response = await page.request.post('/api/auth/register', {
      data: {
        email: `e2e_short_${RUN_ID}@example.com`,
        username: `e2eshort${RUN_ID}`,
        password: 'abcdefg',
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('at least 8 characters');
  });
});
