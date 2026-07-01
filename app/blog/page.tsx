import Link from 'next/link';
import { getBlogPosts } from '@/lib/blog';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | InterlinedList',
};

// DB-backed CMS: render on each request so newly published posts appear
// immediately and the index stays consistent with /blog/[slug].
export const dynamic = 'force-dynamic';

export default async function BlogIndexPage() {
  const posts = await getBlogPosts();

  return (
    <div
      className="container py-5"
      style={{ maxWidth: '800px', margin: '0 auto' }}
    >
      <h1 className="mb-4" style={{ color: 'var(--color-text)' }}>
        Blog
      </h1>
      {posts.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>No posts yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {posts.map((post) => (
            <article
              key={post.slug}
              style={{
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '2rem',
              }}
            >
              <h2 className="h4 mb-1">
                <Link
                  href={`/blog/${post.slug}`}
                  style={{
                    color: 'var(--color-text)',
                    textDecoration: 'none',
                  }}
                >
                  {post.title}
                </Link>
              </h2>
              {post.date && (
                <p
                  className="mb-2 small"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {post.date}
                </p>
              )}
              {post.excerpt && (
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                  {post.excerpt}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
