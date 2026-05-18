import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'documentation', 'blog');

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
 * Discover all blog posts from documentation/blog/*.md, sorted newest-first.
 */
export function getBlogPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));

  const posts: BlogPost[] = files.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const filePath = path.join(BLOG_DIR, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContents);

    return {
      slug,
      title: (data.title as string) || slug,
      date: data.date ? String(data.date).slice(0, 10) : '',
      excerpt: (data.excerpt as string) || '',
    };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Get full content for a single blog post by slug.
 * Returns null if the file does not exist.
 */
export function getBlogContent(slug: string): BlogContent | null {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: (data.title as string) || slug,
    date: data.date ? String(data.date).slice(0, 10) : '',
    excerpt: (data.excerpt as string) || '',
    content,
  };
}
