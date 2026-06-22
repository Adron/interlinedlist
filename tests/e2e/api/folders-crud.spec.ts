import { expect, test } from '@playwright/test';
import { loginAs, TEST_SUBSCRIBER, TEST_USER } from '../helpers/auth';

// ---------------------------------------------------------------------------
// Helper: create a folder as a subscriber and return its id.
// ---------------------------------------------------------------------------
async function createFolder(
  page: Parameters<typeof loginAs>[0],
  name: string,
  parentId?: string
): Promise<string> {
  const res = await page.request.post('/api/folders', {
    data: parentId ? { name, parentId } : { name },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return body.folder.id as string;
}

// ---------------------------------------------------------------------------
// Authentication guard tests
// ---------------------------------------------------------------------------
test.describe('Folders API — unauthenticated returns 401', () => {
  const FAKE_ID = '00000000-0000-0000-0000-000000000002';

  test('GET /api/folders returns 401 without session', async ({ page }) => {
    const res = await page.request.get('/api/folders');
    expect(res.status()).toBe(401);
  });

  test('POST /api/folders returns 401 without session', async ({ page }) => {
    const res = await page.request.post('/api/folders', { data: { name: 'No Session' } });
    expect(res.status()).toBe(401);
  });

  test('PUT /api/folders/:id returns 401 without session', async ({ page }) => {
    const res = await page.request.put(`/api/folders/${FAKE_ID}`, { data: { name: 'Updated' } });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/folders/:id returns 401 without session', async ({ page }) => {
    const res = await page.request.delete(`/api/folders/${FAKE_ID}`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Subscription gate
// ---------------------------------------------------------------------------
test.describe('Folders API — subscription gate', () => {
  test('free-tier user cannot create a folder (403)', async ({ page }) => {
    await loginAs(page, TEST_USER);
    const res = await page.request.post('/api/folders', { data: { name: 'Blocked' } });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Subscribe');
  });
});

// ---------------------------------------------------------------------------
// Subscriber CRUD
// ---------------------------------------------------------------------------
test.describe('Folders API — full CRUD for subscriber', () => {
  let folderId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    folderId = await createFolder(page, `E2E Folder ${Date.now()}`);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!folderId) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    await page.request.delete(`/api/folders/${folderId}`);
    await ctx.close();
  });

  test('POST /api/folders creates a folder and returns 201 with id/name', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const name = `Create Test ${Date.now()}`;
    const res = await page.request.post('/api/folders', { data: { name } });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.folder.id).toBeTruthy();
    expect(body.folder.name).toBe(name);
    // clean up
    await page.request.delete(`/api/folders/${body.folder.id}`);
  });

  test('POST /api/folders returns 400 when name is missing', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.post('/api/folders', { data: { name: '' } });
    expect(res.status()).toBe(400);
  });

  test('GET /api/folders returns the created folder in the list', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get('/api/folders');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.folders)).toBe(true);
    const found = body.folders.find((f: { id: string }) => f.id === folderId);
    expect(found).toBeTruthy();
  });

  test('GET /api/folders response shape includes id, name, parentId', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.get('/api/folders');
    const body = await res.json();
    const folder = body.folders.find((f: { id: string }) => f.id === folderId);
    expect(folder).toMatchObject({ id: expect.any(String), name: expect.any(String) });
    expect('parentId' in folder).toBe(true);
  });

  test('PUT /api/folders/:id renames the folder (200)', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const newName = `Renamed ${Date.now()}`;
    const res = await page.request.put(`/api/folders/${folderId}`, { data: { name: newName } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.folder.name).toBe(newName);
  });

  test('PUT /api/folders/:id returns 404 for a non-existent folder', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(
      '/api/folders/00000000-0000-0000-0000-000000000099',
      { data: { name: 'Ghost' } }
    );
    expect(res.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Name collision: PUT returns 409 when sibling already has that name
// ---------------------------------------------------------------------------
test.describe('Folders API — name collision on rename (409)', () => {
  let folderA: string;
  let folderB: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    folderA = await createFolder(page, `Collision A ${Date.now()}`);
    folderB = await createFolder(page, `Collision B ${Date.now()}`);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    if (folderA) await page.request.delete(`/api/folders/${folderA}`);
    if (folderB) await page.request.delete(`/api/folders/${folderB}`);
    await ctx.close();
  });

  test('renaming folderB to folderA name returns 409', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);

    // Get the current name of folderA
    const listRes = await page.request.get('/api/folders');
    const body = await listRes.json();
    const a = body.folders.find((f: { id: string }) => f.id === folderA);
    expect(a).toBeTruthy();

    const res = await page.request.put(`/api/folders/${folderB}`, { data: { name: a.name } });
    expect(res.status()).toBe(409);
    const errBody = await res.json();
    expect(errBody.error).toMatch(/already exists/i);
  });
});

// ---------------------------------------------------------------------------
// POST /api/folders collision (409)
// ---------------------------------------------------------------------------
test.describe('Folders API — duplicate name on create (409)', () => {
  let createdId: string;
  const uniqueName = `Dup-${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    createdId = await createFolder(page, uniqueName);
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    if (createdId) await page.request.delete(`/api/folders/${createdId}`);
    await ctx.close();
  });

  test('creating a folder with a duplicate name returns 409', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.post('/api/folders', { data: { name: uniqueName } });
    expect(res.status()).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// DELETE detaches lists and soft-deletes the folder
// ---------------------------------------------------------------------------
test.describe.serial('Folders API — DELETE moves lists to root', () => {
  let deleteFolderId: string;
  let listId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    // Create a folder
    deleteFolderId = await createFolder(page, `Delete Test ${Date.now()}`);

    // Create a list and move it into the folder via PUT
    const listRes = await page.request.post('/api/lists', {
      data: { title: `List In Folder ${Date.now()}` },
    });
    expect(listRes.status()).toBe(201);
    const listBody = await listRes.json();
    listId = listBody.data.id;

    const moveRes = await page.request.put(`/api/lists/${listId}`, {
      data: { folderId: deleteFolderId },
    });
    expect(moveRes.status()).toBe(200);

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    if (listId) await page.request.delete(`/api/lists/${listId}`);
    await ctx.close();
  });

  test('DELETE /api/folders/:id returns 200 and folder is gone from list', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);

    const delRes = await page.request.delete(`/api/folders/${deleteFolderId}`);
    expect(delRes.status()).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.message).toMatch(/deleted/i);

    // Folder must no longer appear in GET /api/folders
    const listRes = await page.request.get('/api/folders');
    const listBody = await listRes.json();
    const found = listBody.folders.find((f: { id: string }) => f.id === deleteFolderId);
    expect(found).toBeUndefined();
  });

  test('DELETE /api/folders/:id returns 404 for already-deleted folder', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.delete(`/api/folders/${deleteFolderId}`);
    expect(res.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/lists/[id] — folderId assigns a list to a list folder
// ---------------------------------------------------------------------------
test.describe('Folders API — assign list to folder and back to root', () => {
  let folderId: string;
  let listId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);

    folderId = await createFolder(page, `Assign Test ${Date.now()}`);

    const listRes = await page.request.post('/api/lists', {
      data: { title: `Folder Assign Test ${Date.now()}` },
    });
    expect(listRes.status()).toBe(201);
    listId = (await listRes.json()).data.id;

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_SUBSCRIBER);
    if (listId) await page.request.delete(`/api/lists/${listId}`);
    if (folderId) await page.request.delete(`/api/folders/${folderId}`);
    await ctx.close();
  });

  test('PUT /api/lists/:id with folderId moves the list into the folder (200)', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(`/api/lists/${listId}`, {
      data: { folderId },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.folderId).toBe(folderId);
  });

  test('PUT /api/lists/:id with folderId:null moves list back to root (200)', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(`/api/lists/${listId}`, {
      data: { folderId: null },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.folderId).toBeNull();
  });

  test('PUT /api/lists/:id with a non-existent folderId returns 404', async ({ page }) => {
    await loginAs(page, TEST_SUBSCRIBER);
    const res = await page.request.put(`/api/lists/${listId}`, {
      data: { folderId: '00000000-0000-0000-0000-000000000099' },
    });
    expect(res.status()).toBe(404);
  });
});
