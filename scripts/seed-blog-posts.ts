#!/usr/bin/env npx tsx
/**
 * Seed docs/blog/*.md into the BlogPost table (idempotent — safe to re-run).
 *
 * Each markdown file becomes one published BlogPost, keyed by the unique slug
 * (filename without `.md`). Re-running upserts, so content stays in sync with
 * the markdown files, which remain as the seed source / backup.
 *
 * Targets whatever database DATABASE_URL points at when the script runs.
 * Because `tsx` auto-loads `.env` (which may hold the *remote* URL or a
 * placeholder), ALWAYS pass DATABASE_URL explicitly so the target is
 * unambiguous — the seed refuses to run against an obviously-invalid URL.
 *
 *   Local (localhost, from .env.local):
 *     DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | sed -E 's/^DATABASE_URL=//;s/^"//;s/"$//')" \
 *       npx tsx scripts/seed-blog-posts.ts
 *
 *   Remote (Neon, from .env — this is the same URL db:migrate:deploy uses):
 *     DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env | sed -E 's/^DATABASE_URL=//;s/^"//;s/"$//')" \
 *       npx tsx scripts/seed-blog-posts.ts
 *
 * Do NOT delete docs/blog/*.md — they are the seed source.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { PrismaClient } from '@prisma/client';

// Resolve DATABASE_URL the same precedence the app uses: an already-set shell
// env var wins (so a remote URL passed on the command line targets remote),
// otherwise fall back to .env.local then .env.
function loadEnvFile(file: string) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key in process.env) continue; // shell env wins
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnvFile('.env.local');
loadEnvFile('.env');

const BLOG_DIR = path.join(process.cwd(), 'docs', 'blog');

function parsePublishedAt(date: unknown): Date {
  if (date instanceof Date && !isNaN(date.getTime())) return date;
  if (typeof date === 'string' && date.trim()) {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    const target = dbUrl.replace(/:[^:@/]*@/, ':****@');
    console.log(`[seed-blog-posts] Target DATABASE_URL: ${target || '(unset!)'}`);

    // Guard against tsx/dotenv picking up a placeholder like
    // "postgresql://the url goes here" from .env — never write to a bogus URL.
    if (!/^postgres(ql)?:\/\//.test(dbUrl) || /\s/.test(dbUrl)) {
      console.error(
        '[seed-blog-posts] Refusing to run: DATABASE_URL is missing or invalid. ' +
          'Pass it explicitly, e.g.\n' +
          `  DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.local | sed -E 's/^DATABASE_URL=//;s/^\\"//;s/\\"$//')" npx tsx scripts/seed-blog-posts.ts`
      );
      process.exit(1);
    }

    if (!fs.existsSync(BLOG_DIR)) {
      console.error(`[seed-blog-posts] Blog dir not found: ${BLOG_DIR}`);
      process.exit(1);
    }

    const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
    console.log(`[seed-blog-posts] Found ${files.length} markdown file(s).`);

    let upserted = 0;
    for (const filename of files) {
      const slug = filename.replace(/\.md$/, '');
      const fileContents = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf8');
      const { data, content } = matter(fileContents);

      const title = (data.title as string) || slug;
      const excerpt = (data.excerpt as string) || '';
      const publishedAt = parsePublishedAt(data.date);

      await prisma.blogPost.upsert({
        where: { slug },
        create: {
          slug,
          title,
          excerpt,
          content,
          published: true,
          publishedAt,
        },
        update: {
          title,
          excerpt,
          content,
          published: true,
          publishedAt,
        },
      });

      upserted += 1;
      console.log(`[seed-blog-posts]   upserted "${slug}" (${publishedAt.toISOString().slice(0, 10)})`);
    }

    console.log(`[seed-blog-posts] Done. Upserted ${upserted} blog post(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed-blog-posts] Failed:', err);
  process.exit(1);
});
