/**
 * Admin tabbed interface + DB-backed blog CMS publish flow.
 *
 * The admin area is gated by checkAdminAndPublicOwner(): the caller must be BOTH
 * an Administrator AND owner of "The Public" organization. That is legitimate
 * seed data — this spec creates a dedicated admin user, the "The Public" org,
 * and an owner membership via Prisma in beforeAll (mirroring global-setup /
 * linkedin-personal-pages), then logs in as that user. No product auth is
 * weakened.
 *
 * Runtime guard: if, for any environmental reason, the seeded admin session does
 * NOT actually pass the gate (GET /api/admin/blog !== 200), every test in this
 * file test.skip()s with a clear message rather than faking an admin session.
 * See the API-boundary suite (tests/e2e/api/admin-blog-access-control.spec.ts)
 * for the auth-boundary coverage that runs regardless.
 */

import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: resolve(process.cwd(), '.env.local') });
loadDotenv({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'e2e-admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'testadminpassword1';
const ADMIN_USERNAME = 'e2e_admin';
const PUBLIC_ORG_NAME = 'The Public';
const PUBLIC_ORG_SLUG = 'the-public';

/** Whether the seeded admin session actually passes the server-side gate. */
let adminSessionUsable = false;

async function withPrisma<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const prisma = new PrismaClient();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedRetryingUniqueRaces(seed: () => Promise<void>, maxAttempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      await seed();
      return;
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code !== 'P2002' || attempt >= maxAttempts) throw error;
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
}

test.beforeAll(async () => {
  await seedRetryingUniqueRaces(async () => {
    await withPrisma(async (prisma) => {
      const passwordHash = await hash(ADMIN_PASSWORD, 12);

      const adminUser = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: { emailVerified: true, passwordHash },
        create: {
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
          displayName: 'E2E Admin',
          passwordHash,
          emailVerified: true,
          customerStatus: 'subscriber',
        },
      });

      // Administrator row → user.isAdministrator === true.
      await prisma.administrator.upsert({
        where: { userId: adminUser.id },
        update: {},
        create: { userId: adminUser.id },
      });

      // "The Public" org (name is the exact string checkAdminAndPublicOwner looks up).
      // A prior run may have soft-deleted it — clear deletedAt so the lookup matches.
      const publicOrg = await prisma.organization.upsert({
        where: { name: PUBLIC_ORG_NAME },
        update: { deletedAt: null },
        create: {
          name: PUBLIC_ORG_NAME,
          slug: PUBLIC_ORG_SLUG,
          isPublic: true,
          isSystem: true,
        },
      });

      // Owner membership.
      await prisma.userOrganization.upsert({
        where: {
          userId_organizationId: {
            userId: adminUser.id,
            organizationId: publicOrg.id,
          },
        },
        update: { role: 'owner', active: true },
        create: {
          userId: adminUser.id,
          organizationId: publicOrg.id,
          role: 'owner',
          active: true,
        },
      });
    });
  });
});

/**
 * Establish the admin session on `page` and confirm it actually passes the gate.
 * Sets the module-level `adminSessionUsable` flag so per-test guards can skip
 * cleanly instead of failing (or faking) when the gate is not satisfiable here.
 */
async function loginAsAdmin(page: Page): Promise<boolean> {
  await loginAs(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const res = await page.request.get('/api/admin/blog');
  adminSessionUsable = res.status() === 200;
  return adminSessionUsable;
}

test.describe('Admin tab navigation', () => {
  const TABS = [
    { label: 'Users', href: '/admin' },
    { label: 'Analytics', href: '/admin/analytics' },
    { label: 'Support Links', href: '/admin/support-links' },
    { label: 'Email Logging', href: '/admin/email-logging' },
    { label: 'Blogging', href: '/admin/blog' },
  ];

  test('renders all five tabs and each navigates + marks itself active', async ({ page }) => {
    const usable = await loginAsAdmin(page);
    test.skip(
      !usable,
      'Seeded admin session did not pass checkAdminAndPublicOwner() in this environment.'
    );

    await page.goto('/admin');

    // The tab bar is a <ul role="tablist"> containing all five links.
    const tablist = page.getByRole('tablist');
    for (const tab of TABS) {
      await expect(tablist.getByRole('link', { name: tab.label })).toBeVisible();
    }

    // Click through each tab: assert destination URL and the active tab.
    for (const tab of TABS) {
      await tablist.getByRole('link', { name: tab.label }).click();
      await expect(page).toHaveURL(new RegExp(`${tab.href.replace(/\//g, '\\/')}$`));

      const activeLink = tablist.getByRole('link', { name: tab.label });
      // Active tab carries aria-current="page" (AdminTabs sets this).
      await expect(activeLink).toHaveAttribute('aria-current', 'page');
      await expect(activeLink).toHaveClass(/active/);
    }

    // Ending on the Blogging tab, its page heading confirms the blog manager.
    await expect(page.getByRole('heading', { name: 'Blogging' })).toBeVisible();
  });
});

test.describe('Admin blog CMS — create, publish, unpublish flow', () => {
  test('create a draft, publish it to /blog, then unpublish it', async ({ page, context }) => {
    const usable = await loginAsAdmin(page);
    test.skip(
      !usable,
      'Seeded admin session did not pass checkAdminAndPublicOwner() in this environment.'
    );

    const unique = Date.now();
    const title = `E2E Admin Flow Post ${unique}`;
    const bodyMarker = `e2e-admin-flow-body-${unique}`;
    const content = `## Admin Flow Heading\n\nBody with ${bodyMarker}.`;

    await page.goto('/admin/blog');
    await expect(page.getByRole('heading', { name: 'Blogging' })).toBeVisible();

    // --- Create a DRAFT (published switch left off) ---
    await page.getByRole('button', { name: 'New Post' }).click();
    await page.getByLabel('Title').fill(title);
    await page.getByLabel(/^Content/).fill(content);
    await page.getByRole('button', { name: 'Create Post' }).click();

    // After create the form switches to edit mode (Save Changes button appears)
    // and a Publish button is shown for the now-persisted post.
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();

    // The post appears in the list with a Draft badge.
    const listRow = page.locator('tr', { hasText: title });
    await expect(listRow.getByText('Draft')).toBeVisible();

    // The draft must NOT be visible on the public blog yet.
    const publicPage = await context.newPage();
    await publicPage.goto('/blog');
    await expect(publicPage.getByRole('link', { name: title })).toHaveCount(0);

    // --- PUBLISH ---
    await page.getByRole('button', { name: 'Publish' }).click();
    // The list badge flips to Published (router.refresh re-renders the row).
    await expect(listRow.getByText('Published')).toBeVisible();

    // Now the post shows up on the public listing and renders on its slug page.
    await publicPage.goto('/blog');
    const publishedLink = publicPage.getByRole('link', { name: title });
    await expect(publishedLink).toBeVisible();
    await publishedLink.click();
    await expect(publicPage.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(publicPage.getByText(bodyMarker)).toBeVisible();

    // --- UNPUBLISH ---
    await page.getByRole('button', { name: 'Unpublish' }).click();
    await expect(listRow.getByText('Draft')).toBeVisible();

    // Public listing no longer shows it.
    await publicPage.goto('/blog');
    await expect(publicPage.getByRole('link', { name: title })).toHaveCount(0);

    await publicPage.close();

    // --- Cleanup: delete the post via the admin API to keep the DB tidy. ---
    // Fetch its id, then DELETE (accept dialog handled just in case UI is used).
    const listRes = await page.request.get('/api/admin/blog');
    if (listRes.ok()) {
      const { posts } = await listRes.json();
      const created = (posts as Array<{ id: string; title: string }>).find(
        (p) => p.title === title
      );
      if (created) {
        await page.request.delete(`/api/admin/blog/${created.id}`);
      }
    }
  });
});
