import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// ---------------------------------------------------------------------------
// PUT /api/documents/[id] — folderId field moves a document to a folder
// The document route uses prisma.folder (document folders), not listFolder.
// ---------------------------------------------------------------------------

test.describe('Document move to folder — PUT /api/documents/:id with folderId', () => {
  let documentId: string;
  let documentFolderId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    // Create a root-level document
    const docRes = await page.request.post('/api/documents', {
      data: { title: `Move Test Doc ${Date.now()}`, content: '' },
    });
    expect(docRes.status()).toBe(201);
    const docBody = await docRes.json();
    documentId = docBody.document.id;

    // Create a document folder (uses /api/documents/folders, not /api/folders)
    const folderRes = await page.request.post('/api/documents/folders', {
      data: { name: `Doc Folder ${Date.now()}` },
    });
    expect(folderRes.status()).toBe(201);
    const folderBody = await folderRes.json();
    documentFolderId = folderBody.folder.id;

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    if (documentId) await page.request.delete(`/api/documents/${documentId}`);
    if (documentFolderId) await page.request.delete(`/api/documents/folders/${documentFolderId}`);
    await ctx.close();
  });

  test('PUT with folderId moves the document into the folder (200)', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(`/api/documents/${documentId}`, {
      data: { folderId: documentFolderId },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.document.folderId).toBe(documentFolderId);
  });

  test('PUT with folderId:null moves the document back to root (200)', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(`/api/documents/${documentId}`, {
      data: { folderId: null },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.document.folderId).toBeNull();
  });

  test('PUT with a folder that belongs to another user returns 403', async ({ page }) => {
    // TEST_USER creates their own folder, but TEST_SUBSCRIBER tries to use it
    // We simulate a foreign folderId by using a UUID that will not match the subscriber's folders
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(`/api/documents/${documentId}`, {
      data: { folderId: '00000000-0000-0000-0000-000000000003' },
    });
    // The route returns 403 when the folder is not found / not owned by the user
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/access denied|not found/i);
  });

  test('PUT /api/documents/:id returns 401 without session', async ({ page }) => {
    const res = await page.request.put(`/api/documents/${documentId}`, {
      data: { folderId: null },
    });
    expect(res.status()).toBe(401);
  });

  test('PUT /api/documents/:id returns 404 for non-existent document', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(
      '/api/documents/00000000-0000-0000-0000-000000000099',
      { data: { folderId: null } }
    );
    expect(res.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Cross-user isolation: TEST_USER cannot move TEST_SUBSCRIBER's document
// ---------------------------------------------------------------------------
test.describe('Document move — cross-user isolation', () => {
  let subscriberDocId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const res = await page.request.post('/api/documents', {
      data: { title: `Isolation Doc ${Date.now()}`, content: '' },
    });
    expect(res.status()).toBe(201);
    subscriberDocId = (await res.json()).document.id;

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!subscriberDocId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await page.request.delete(`/api/documents/${subscriberDocId}`);
    await ctx.close();
  });

  test('TEST_USER cannot update (move) a document owned by TEST_SUBSCRIBER', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const res = await page.request.put(`/api/documents/${subscriberDocId}`, {
      data: { folderId: null },
    });
    // The document is not visible to TEST_USER, so it returns 404
    expect(res.status()).toBe(404);
  });
});
