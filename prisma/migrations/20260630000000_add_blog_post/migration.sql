-- Database-backed blog (idempotent + additive).
-- Adds the blog_posts table so blog content can be published/maintained from the
-- admin UI instead of the read-only Vercel runtime filesystem (docs/blog/*.md).
-- Safe to run twice: every statement uses IF NOT EXISTS / a constraint-existence guard.
-- If this migration previously failed with P3018 / 42P07, run once against the target DB:
--   npx prisma migrate resolve --rolled-back 20260630000000_add_blog_post
-- then re-run: npm run db:migrate (local) / npm run db:migrate:deploy (remote)

-- CreateTable
CREATE TABLE IF NOT EXISTS "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique slug)
CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex (public listing: published posts, newest first)
CREATE INDEX IF NOT EXISTS "blog_posts_published_publishedAt_idx" ON "blog_posts"("published", "publishedAt");

-- CreateIndex (author lookups)
CREATE INDEX IF NOT EXISTS "blog_posts_authorId_idx" ON "blog_posts"("authorId");

-- AddForeignKey (skip if constraint already present)
DO $$
BEGIN
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
