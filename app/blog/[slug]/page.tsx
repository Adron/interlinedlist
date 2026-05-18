import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { getBlogContent, getBlogPosts } from '@/lib/blog';
import type { Metadata } from 'next';

interface BlogPostPageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata(
  { params }: BlogPostPageProps,
): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const post = getBlogContent(slug);
  return {
    title: post ? `${post.title} | InterlinedList` : 'Blog | InterlinedList',
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await Promise.resolve(params);
  const post = getBlogContent(slug);

  if (!post) {
    notFound();
  }

  return (
    <div
      className="container py-5"
      style={{ maxWidth: '800px', margin: '0 auto' }}
    >
      <h1 className="mb-1" style={{ color: 'var(--color-text)' }}>
        {post.title}
      </h1>
      {post.date && (
        <p
          className="mb-4 small"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {post.date}
        </p>
      )}
      <div className="help-content">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a href={href ?? '#'} className="text-primary">
                {children}
              </a>
            ),
            pre: ({ children }) => (
              <pre className="help-pre">{children}</pre>
            ),
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}
