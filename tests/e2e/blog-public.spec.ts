/**
 * Public blog rendering — DB-backed CMS.
 *
 * The blog is served from prisma.blogPost via /lib/blog:
 *   - /blog          lists published posts (title link → /blog/[slug], excerpt)
 *   - /blog/[slug]   renders the post <h1> title + markdown body
 *
 * Blog posts are NOT part of global-setup (that only seeds the two test users),
 * so this spec seeds one deterministic PUBLISHED post via Prisma in beforeAll —
 * mirroring the global-setup / linkedin-personal-pages Prisma pattern — and
 * asserts it renders on both the listing and the post page. This keeps the test
 * green whether or not the docs/blog/*.md fixtures were separately seeded.
 */

import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';

// Load env before Prisma client is instantiated (same order as global-setup).
loadDotenv({ path: resolve(process.cwd(), '.env.local') });
loadDotenv({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';

const SEED_SLUG = 'e2e-public-blog-render';
const SEED_TITLE = 'E2E Public Blog Render Post';
const SEED_EXCERPT = 'A deterministic published post seeded for the public blog e2e test.';
// A distinctive markdown body: a heading and a paragraph with a unique marker
// so we can assert the markdown actually rendered (heading element + text).
const SEED_MARKER = 'e2e-markdown-body-marker-9f3a';
const SEED_CONTENT = [
  '## Rendered Heading',
  '',
  `This is the post body containing the ${SEED_MARKER} marker.`,
].join('\n');

async function withPrisma<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const prisma = new PrismaClient();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * fullyParallel runs beforeAll once per worker; concurrent workers can race the
 * create branch of an upsert (P2002). Retry so the loser takes the update path.
 */
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
    await withPrisma((prisma) =>
      prisma.blogPost.upsert({
        where: { slug: SEED_SLUG },
        update: {
          title: SEED_TITLE,
          excerpt: SEED_EXCERPT,
          content: SEED_CONTENT,
          published: true,
          publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        create: {
          slug: SEED_SLUG,
          title: SEED_TITLE,
          excerpt: SEED_EXCERPT,
          content: SEED_CONTENT,
          published: true,
          publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      })
    );
  });
});

test.describe('Public blog listing (/blog)', () => {
  test('renders without a server error', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading', { name: 'Blog', level: 1 })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Internal server error');
  });

  test('shows the seeded published post as a link to its slug page', async ({ page }) => {
    await page.goto('/blog');

    // Each post title is an <h2> wrapping a <Link> to /blog/[slug].
    const postLink = page.getByRole('link', { name: SEED_TITLE });
    await expect(postLink).toBeVisible();
    await expect(postLink).toHaveAttribute('href', `/blog/${SEED_SLUG}`);

    // At least one post link is present (the listing is populated).
    const anyPostLink = page.locator(`a[href^="/blog/"]`);
    expect(await anyPostLink.count()).toBeGreaterThan(0);
  });
});

test.describe('Public blog post page (/blog/[slug])', () => {
  test('clicking a post from the listing renders its title and markdown body', async ({ page }) => {
    await page.goto('/blog');

    await page.getByRole('link', { name: SEED_TITLE }).click();

    await expect(page).toHaveURL(new RegExp(`/blog/${SEED_SLUG}$`));

    // Title renders as the page <h1>.
    await expect(page.getByRole('heading', { name: SEED_TITLE, level: 1 })).toBeVisible();

    // Markdown body rendered: the "## Rendered Heading" became a heading element,
    // and the unique marker text is present in the rendered paragraph.
    await expect(page.getByRole('heading', { name: 'Rendered Heading' })).toBeVisible();
    await expect(page.getByText(SEED_MARKER)).toBeVisible();
  });

  test('navigating directly to the slug renders the post', async ({ page }) => {
    await page.goto(`/blog/${SEED_SLUG}`);
    await expect(page.getByRole('heading', { name: SEED_TITLE, level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(SEED_TITLE));
  });

  test('an unknown slug returns a 404 (not a 500)', async ({ page }) => {
    const res = await page.goto('/blog/this-slug-does-not-exist-e2e');
    // notFound() renders the 404 page — assert it is not a server error.
    expect(res?.status()).toBe(404);
  });
});
