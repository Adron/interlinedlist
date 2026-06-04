/**
 * Nested folder creation — E2E tests
 *
 * Auth requirements
 * -----------------
 * Uses the shared test-account fixture (global-setup.ts) and the `loginAs`
 * helper.  The TEST_SUBSCRIBER account has customerStatus='subscriber' and is
 * used for all flows that require the subscription gate to pass.  TEST_USER is
 * a free-tier account used to verify the non-subscriber redirect.
 *
 * Seed data
 * ---------
 * Every describe block that needs a real folder creates one via
 * POST /api/documents/folders in beforeAll and removes it in afterAll, so the
 * suite is self-contained and idempotent.
 *
 * Covered scenarios
 * -----------------
 * Folder page (subscriber)
 *   1. "New Subfolder" button is visible and links to the correct URL.
 *
 * New-subfolder page
 *   2. The page renders the form and correct breadcrumbs.
 *   3. Filling in a name and submitting creates the subfolder and redirects to
 *      its own folder page.
 *   4. Clicking Cancel navigates back to the parent folder.
 *
 * FolderTree sidebar
 *   5. Hovering a folder row shows the bx-folder-plus icon link to new-folder.
 *
 * Non-subscriber gate
 *   6. A free-tier user visiting /new-folder is redirected to the parent folder.
 */

import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// ---------------------------------------------------------------------------
// Helper — create a document folder via the API and return its id.
// The /api/documents/folders endpoint is the one that CreateFolderForm uses.
// ---------------------------------------------------------------------------
async function createDocFolder(
  page: Parameters<typeof loginAs>[0],
  name: string,
  parentId?: string
): Promise<string> {
  const res = await page.request.post('/api/documents/folders', {
    data: parentId ? { name, parentId } : { name },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return body.folder.id as string;
}

async function deleteDocFolder(
  page: Parameters<typeof loginAs>[0],
  id: string
): Promise<void> {
  // Best-effort: ignore 404 on folders that were already removed by the test.
  await page.request.delete(`/api/documents/folders/${id}`);
}

// ---------------------------------------------------------------------------
// 1. "New Subfolder" button on the folder page
// ---------------------------------------------------------------------------
test.describe('Folder page — New Subfolder button (subscriber)', () => {
  let parentId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    parentId = await createDocFolder(page, `E2E Parent ${Date.now()}`);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!parentId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await deleteDocFolder(page, parentId);
    await ctx.close();
  });

  test('shows New Subfolder button that links to the new-folder route', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await page.goto(`/documents/folders/${parentId}`);

    const btn = page.getByRole('link', { name: /New Subfolder/i });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute(
      'href',
      `/documents/folders/${parentId}/new-folder`
    );
  });
});

// ---------------------------------------------------------------------------
// 2. New-subfolder page renders form + breadcrumbs
// ---------------------------------------------------------------------------
test.describe('New Subfolder page — renders form and breadcrumbs', () => {
  let parentId: string;
  let parentName: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    parentName = `E2E BreadcrumbParent ${Date.now()}`;
    parentId = await createDocFolder(page, parentName);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!parentId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await deleteDocFolder(page, parentId);
    await ctx.close();
  });

  test('renders Create New Folder heading', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await page.goto(`/documents/folders/${parentId}/new-folder`);

    await expect(
      page.getByRole('heading', { name: /Create New Folder/i })
    ).toBeVisible();
  });

  test('renders Folder name input', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await page.goto(`/documents/folders/${parentId}/new-folder`);

    // CreateFolderForm renders a <label> without htmlFor, so locate via placeholder.
    await expect(page.getByPlaceholder('Folder name')).toBeVisible();
  });

  test('breadcrumb shows Documents > parent folder name > New Subfolder', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await page.goto(`/documents/folders/${parentId}/new-folder`);

    const breadcrumb = page.getByLabel('breadcrumb');
    await expect(breadcrumb).toContainText('Documents');
    await expect(breadcrumb).toContainText(parentName);
    await expect(breadcrumb).toContainText('New Subfolder');
  });

  test('breadcrumb Documents link points to /documents', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await page.goto(`/documents/folders/${parentId}/new-folder`);

    await expect(
      page.getByLabel('breadcrumb').getByRole('link', { name: 'Documents' })
    ).toHaveAttribute('href', '/documents');
  });

  test('breadcrumb parent folder link points back to the parent folder', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await page.goto(`/documents/folders/${parentId}/new-folder`);

    await expect(
      page.getByLabel('breadcrumb').getByRole('link', { name: parentName })
    ).toHaveAttribute('href', `/documents/folders/${parentId}`);
  });
});

// ---------------------------------------------------------------------------
// 3. Create subfolder — form submission redirects to the new folder page
// ---------------------------------------------------------------------------
test.describe('New Subfolder page — create subfolder happy path', () => {
  let parentId: string;
  let createdChildId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    parentId = await createDocFolder(page, `E2E CreateParent ${Date.now()}`);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    // Delete child first (if created), then the parent.
    if (createdChildId) await deleteDocFolder(page, createdChildId);
    if (parentId) await deleteDocFolder(page, parentId);
    await ctx.close();
  });

  test('filling name and submitting redirects to the new subfolder page', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await page.goto(`/documents/folders/${parentId}/new-folder`);

    const subfolderName = `E2E Subfolder ${Date.now()}`;
    // CreateFolderForm renders a <label> without htmlFor, so locate via placeholder.
    await page.getByPlaceholder('Folder name').fill(subfolderName);

    // Intercept the POST to capture the new folder id before the navigation.
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/documents/folders') && r.request().method() === 'POST'
      ),
      page.getByRole('button', { name: /Create/i }).click(),
    ]);

    expect(response.status()).toBe(201);
    const body = await response.json();
    createdChildId = body.folder.id as string;

    // After the successful POST the client router.push sends to /documents/folders/<child-id>
    await expect(page).toHaveURL(`/documents/folders/${createdChildId}`, { timeout: 10_000 });

    // The folder page for the newly created subfolder should show the subfolder name
    await expect(page.getByText(subfolderName).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Cancel returns to parent folder
// ---------------------------------------------------------------------------
test.describe('New Subfolder page — Cancel navigates back to parent', () => {
  let parentId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    parentId = await createDocFolder(page, `E2E CancelParent ${Date.now()}`);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!parentId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await deleteDocFolder(page, parentId);
    await ctx.close();
  });

  test('clicking Cancel returns to the parent folder URL', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    await page.goto(`/documents/folders/${parentId}/new-folder`);

    // Use exact match to avoid the breadcrumb folder link being matched by a
    // substring of "Cancel" in a dynamically-named test folder.
    await page.getByRole('link', { name: 'Cancel', exact: true }).click();

    await expect(page).toHaveURL(`/documents/folders/${parentId}`, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 5. FolderTree sidebar — hover reveals bx-folder-plus link
// ---------------------------------------------------------------------------
test.describe('FolderTree sidebar — subfolder icon appears on hover', () => {
  let parentId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    parentId = await createDocFolder(page, `E2E HoverTree ${Date.now()}`);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!parentId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await deleteDocFolder(page, parentId);
    await ctx.close();
  });

  test('hovering a folder row in the FolderTree shows the New Subfolder link', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    // Navigate to /documents so the FolderTree sidebar is rendered.
    await page.goto('/documents');

    // Wait for the FolderTree to finish loading and show the folder link.
    const folderLink = page.getByRole('link', { name: new RegExp('E2E HoverTree') }).first();
    await expect(folderLink).toBeVisible({ timeout: 10_000 });

    // The hover div is the direct parent of the folder link (d-flex align-items-center).
    // Hover directly on the folder link text — onMouseEnter fires on the parent container.
    await folderLink.hover();

    // After hover, the icon-only "New subfolder" link appears.
    // The FolderTree renders it as <a title="New subfolder" href="..."> so we
    // target it with the title attribute selector for reliability.
    const subfolderIconLink = page.locator(`a[title="New subfolder"][href="/documents/folders/${parentId}/new-folder"]`);
    await expect(subfolderIconLink).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// 6. Non-subscriber visiting /new-folder is redirected to parent folder
// ---------------------------------------------------------------------------
test.describe('New Subfolder page — non-subscriber is redirected', () => {
  // We use the list-folders API (no subscription gate) to create a folder
  // for the free user so we have a valid id to navigate to.
  // The /api/folders endpoint (list-folders, NOT documents/folders) allows
  // read but the document-folder creation requires a subscriber, so we create
  // a document folder as the SUBSCRIBER and then visit as the free TEST_USER
  // to test the redirect.
  let parentId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    parentId = await createDocFolder(page, `E2E NonSubGate ${Date.now()}`);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!parentId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await deleteDocFolder(page, parentId);
    await ctx.close();
  });

  test('non-subscriber is redirected away from the new-folder page', async ({ page }) => {
    await loginAs(page, TEST_USER);

    const response = await page.request.get(
      `/documents/folders/${parentId}/new-folder`,
      { maxRedirects: 0 }
    );

    // The server-side redirect() sends a 307 back to the parent folder.
    // The exact status code may vary by Next.js version (302 / 307 / 308).
    expect([302, 307, 308]).toContain(response.status());

    const location = response.headers()['location'] ?? '';
    expect(location).toContain(`/documents/folders/${parentId}`);
    expect(location).not.toContain('/error');
    expect(location).not.toContain('/500');
  });

  test('non-subscriber navigating via browser ends up on the parent folder page (not an error)', async ({
    page,
  }) => {
    await loginAs(page, TEST_USER);

    // The folder belongs to the subscriber, not TEST_USER, so the page
    // will either redirect to the parent folder or to /documents (both acceptable).
    // What must NOT happen is a 500 error page.
    await page.goto(`/documents/folders/${parentId}/new-folder`);

    await expect(page.locator('body')).not.toContainText('Internal server error');
    await expect(page.locator('body')).not.toContainText('Application error');

    // The URL must no longer be the /new-folder path.
    await expect(page).not.toHaveURL(/\/new-folder/, { timeout: 10_000 });
  });
});
