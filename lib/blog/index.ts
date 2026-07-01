import {
  getPublishedPosts,
  getPublishedPostBySlug,
  type PublicBlogPost,
  type PublicBlogContent,
} from '@/lib/blog/queries';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
}

export interface BlogContent extends BlogPost {
  content: string;
}

/**
 * All published blog posts, newest-first. DB-backed CMS.
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const posts: PublicBlogPost[] = await getPublishedPosts();
  return posts;
}

/**
 * Full content for a single published blog post by slug, or null.
 * Drafts are never returned publicly.
 */
export async function getBlogContent(slug: string): Promise<BlogContent | null> {
  const post: PublicBlogContent | null = await getPublishedPostBySlug(slug);
  return post;
}
