import { Page, request as playwrightRequest } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? 'testuser@example.com',
  password: process.env.TEST_USER_PASSWORD ?? 'testpassword1',
};

export const TEST_SUBSCRIBER = {
  email: process.env.TEST_SUBSCRIBER_EMAIL ?? 'testsubscriber@example.com',
  password: process.env.TEST_SUBSCRIBER_PASSWORD ?? 'testpassword2',
};

/**
 * Log in via the API and store the resulting session cookie on `page`.
 * Faster than driving the login UI — use this in beforeEach for authenticated tests.
 */
export async function loginAs(
  page: Page,
  credentials: { email: string; password: string }
) {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
  const response = await ctx.post('/api/auth/login', {
    data: { email: credentials.email, password: credentials.password },
  });

  if (!response.ok()) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `loginAs failed for ${credentials.email}: ${response.status()} ${JSON.stringify(body)}`
    );
  }

  // Transfer all cookies from the request context to the page's browser context
  const cookies = await ctx.storageState();
  await page.context().addCookies(cookies.cookies);
  await ctx.dispose();
}
