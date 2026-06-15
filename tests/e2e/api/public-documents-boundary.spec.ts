import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER } from '../helpers/auth';

test.describe('Public document boundary — private docs/folders not exposed via unauthenticated endpoint', () => {
  let privateParentFolderId: string;
  let privateChildFolderId: string;
  let publicParentFolderId: string;
  let publicChildFolderId: string;
  let privateDocumentId: string;
  let publicDocumentId: string;
  const SUBSCRIBER_USERNAME = 'testsubscriber';
  const TEST_SUFFIX = Date.now();

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    const privateParentFolderRes = await page.request.post('/api/documents/folders', {
      data: { name: `Private Parent ${TEST_SUFFIX}` },
    });
    expect(privateParentFolderRes.status()).toBe(201);
    privateParentFolderId = (await privateParentFolderRes.json()).folder.id;

    const privateChildFolderRes = await page.request.post('/api/documents/folders', {
      data: { name: `Private Child ${TEST_SUFFIX}`, parentId: privateParentFolderId },
    });
    expect(privateChildFolderRes.status()).toBe(201);
    privateChildFolderId = (await privateChildFolderRes.json()).folder.id;

    const publicParentFolderRes = await page.request.post('/api/documents/folders', {
      data: { name: `Public Parent ${TEST_SUFFIX}` },
    });
    expect(publicParentFolderRes.status()).toBe(201);
    publicParentFolderId = (await publicParentFolderRes.json()).folder.id;

    const publicChildFolderRes = await page.request.post('/api/documents/folders', {
      data: { name: `Public Child ${TEST_SUFFIX}`, parentId: publicParentFolderId },
    });
    expect(publicChildFolderRes.status()).toBe(201);
    publicChildFolderId = (await publicChildFolderRes.json()).folder.id;

    const privateDocumentRes = await page.request.post(
      `/api/documents/folders/${privateChildFolderId}/documents`,
      {
        data: { title: `Private Boundary Document ${TEST_SUFFIX}`, content: '', isPublic: false },
      }
    );
    expect(privateDocumentRes.status()).toBe(201);
    privateDocumentId = (await privateDocumentRes.json()).document.id;

    const publicDocumentRes = await page.request.post(
      `/api/documents/folders/${publicChildFolderId}/documents`,
      {
        data: { title: `Public Boundary Document ${TEST_SUFFIX}`, content: '', isPublic: true },
      }
    );
    expect(publicDocumentRes.status()).toBe(201);
    publicDocumentId = (await publicDocumentRes.json()).document.id;

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    if (privateDocumentId) {
      await page.request.delete(`/api/documents/${privateDocumentId}`);
    }
    if (publicDocumentId) {
      await page.request.delete(`/api/documents/${publicDocumentId}`);
    }
    if (privateChildFolderId) {
      await page.request.delete(`/api/documents/folders/${privateChildFolderId}`);
    }
    if (privateParentFolderId) {
      await page.request.delete(`/api/documents/folders/${privateParentFolderId}`);
    }
    if (publicChildFolderId) {
      await page.request.delete(`/api/documents/folders/${publicChildFolderId}`);
    }
    if (publicParentFolderId) {
      await page.request.delete(`/api/documents/folders/${publicParentFolderId}`);
    }

    await ctx.close();
  });

  test('anonymous GET /api/users/:username/documents does not include private documents', async ({
    page,
  }) => {
    const res = await page.request.get(`/api/users/${SUBSCRIBER_USERNAME}/documents`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const ids = (body.documents ?? []).map((d: { id: string }) => d.id);
    expect(ids).not.toContain(privateDocumentId);
  });

  test('anonymous GET /api/users/:username/documents includes public documents', async ({ page }) => {
    const res = await page.request.get(`/api/users/${SUBSCRIBER_USERNAME}/documents`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const ids = (body.documents ?? []).map((d: { id: string }) => d.id);
    expect(ids).toContain(publicDocumentId);
  });

  test('anonymous GET /api/users/:username/documents excludes private-only folders but includes public folder ancestors', async ({
    page,
  }) => {
    const res = await page.request.get(`/api/users/${SUBSCRIBER_USERNAME}/documents`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const folderIds = (body.folders ?? []).map((f: { id: string }) => f.id);

    expect(folderIds).not.toContain(privateParentFolderId);
    expect(folderIds).not.toContain(privateChildFolderId);
    expect(folderIds).toContain(publicParentFolderId);
    expect(folderIds).toContain(publicChildFolderId);
  });

  test('GET /api/users/unknownuser/documents returns 404', async ({ page }) => {
    const res = await page.request.get('/api/users/thisuserdoesnotexist_xyz123/documents');
    expect(res.status()).toBe(404);
  });
});
