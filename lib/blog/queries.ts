import { prisma } from '@/lib/prisma';

export interface PublicBlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
}

export interface PublicBlogContent extends PublicBlogPost {
  content: string;
}

/**
 * Convert a title into a URL-safe slug.
 * PURE: lowercase, non-alphanumerics → hyphens, collapse repeats, trim ends.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Derive an excerpt from markdown content when none is supplied.
 * PURE: takes the first paragraph (or first `max` chars), stripping heading
 * markers and collapsing whitespace.
 */
export function deriveExcerpt(content: string, max = 200): string {
  const firstParagraph = content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block.length > 0);

  const source = firstParagraph ?? '';

  const stripped = source
    .replace(/^#{1,6}\s+/gm, '') // heading markers
    .replace(/\s+/g, ' ')
    .trim();

  if (stripped.length <= max) return stripped;
  return `${stripped.slice(0, max).trimEnd()}…`;
}

/**
 * Ensure `slug` is unique across posts. If another post (other than
 * `excludeId`) already owns it, append `-2`, `-3`, … until free.
 */
export async function ensureUniqueSlug(
  slug: string,
  excludeId?: string,
): Promise<string> {
  let candidate = slug;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.blogPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
}

function toDateString(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : '';
}

/**
 * True when a Prisma write failed on the unique-slug constraint (P2002).
 * `ensureUniqueSlug` is a read-then-write, so two concurrent writes can still
 * collide on the DB index; callers use this to map that to a 409 rather than a
 * generic 500.
 */
export function isUniqueSlugConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

// --- Public reads (published only) -----------------------------------------

/**
 * All published posts, newest-first, in the public listing shape.
 */
export async function getPublishedPosts(): Promise<PublicBlogPost[]> {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    select: { slug: true, title: true, excerpt: true, publishedAt: true },
  });

  return posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: toDateString(post.publishedAt),
    excerpt: post.excerpt,
  }));
}

/**
 * A single published post by slug, or null. Drafts are never returned here.
 */
export async function getPublishedPostBySlug(
  slug: string,
): Promise<PublicBlogContent | null> {
  const post = await prisma.blogPost.findFirst({
    where: { slug, published: true },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      publishedAt: true,
    },
  });

  if (!post) return null;

  return {
    slug: post.slug,
    title: post.title,
    date: toDateString(post.publishedAt),
    excerpt: post.excerpt,
    content: post.content,
  };
}

// --- Admin CRUD (no published filter) --------------------------------------

export type AdminBlogPost = Awaited<ReturnType<typeof listAllPostsForAdmin>>[number];

/**
 * Serialize an admin post row to JSON-safe shape (Dates → ISO strings).
 */
export function serializeAdminPost(post: AdminBlogPost) {
  return {
    ...post,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export type SerializedAdminBlogPost = ReturnType<typeof serializeAdminPost>;

/**
 * All posts (drafts included), newest-updated first, for the admin UI.
 */
export async function listAllPostsForAdmin() {
  return prisma.blogPost.findMany({
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * A single post by id (drafts included), or null.
 */
export async function getPostByIdForAdmin(id: string) {
  return prisma.blogPost.findUnique({ where: { id } });
}

export interface CreatePostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  published?: boolean;
  authorId?: string | null;
}

/**
 * Create a post. Slug is derived from the title when blank, made unique, and
 * the excerpt is derived from content when blank. `publishedAt` is set to now
 * when `published` is true.
 */
export async function createPost(input: CreatePostInput) {
  const title = input.title.trim();
  const content = input.content ?? '';
  const published = input.published ?? false;

  const baseSlug = input.slug && input.slug.trim() ? slugify(input.slug) : slugify(title);
  const slug = await ensureUniqueSlug(baseSlug || 'post');

  const excerpt =
    input.excerpt && input.excerpt.trim()
      ? input.excerpt.trim()
      : deriveExcerpt(content);

  return prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      published,
      publishedAt: published ? new Date() : null,
      authorId: input.authorId ?? null,
    },
  });
}

export interface UpdatePostInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  published?: boolean;
}

/**
 * Update a post. When slug changes it is re-uniquified (excluding this post);
 * a blank excerpt is re-derived from content. Publish transition: setting
 * `published: true` on a post that has never been published stamps
 * `publishedAt = now`; unpublishing leaves `publishedAt` untouched so a later
 * re-publish keeps the original date.
 */
export async function updatePost(id: string, patch: UpdatePostInput) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Post not found');
  }

  const data: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    published?: boolean;
    publishedAt?: Date;
  } = {};

  if (patch.title !== undefined) {
    data.title = patch.title.trim();
  }

  if (patch.slug !== undefined) {
    const normalized = slugify(patch.slug) || slugify(patch.title ?? existing.title);
    if (normalized !== existing.slug) {
      data.slug = await ensureUniqueSlug(normalized || 'post', id);
    }
  }

  if (patch.content !== undefined) {
    data.content = patch.content;
  }

  if (patch.excerpt !== undefined) {
    if (patch.excerpt.trim()) {
      data.excerpt = patch.excerpt.trim();
    } else {
      const contentForExcerpt =
        patch.content !== undefined ? patch.content : existing.content;
      data.excerpt = deriveExcerpt(contentForExcerpt);
    }
  }

  if (patch.published !== undefined) {
    data.published = patch.published;
    if (patch.published === true && existing.publishedAt === null) {
      data.publishedAt = new Date();
    }
  }

  return prisma.blogPost.update({ where: { id }, data });
}

/**
 * Delete a post by id.
 */
export async function deletePost(id: string) {
  return prisma.blogPost.delete({ where: { id } });
}
