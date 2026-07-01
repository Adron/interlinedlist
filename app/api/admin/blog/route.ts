import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAndPublicOwner } from '@/lib/auth/admin-access';
import {
  createPost,
  isUniqueSlugConflict,
  listAllPostsForAdmin,
  serializeAdminPost,
} from '@/lib/blog/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/blog — list all posts (drafts included) for the admin UI.
 */
export async function GET() {
  const user = await checkAdminAndPublicOwner();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const posts = await listAllPostsForAdmin();
  return NextResponse.json({ posts: posts.map(serializeAdminPost) });
}

/**
 * POST /api/admin/blog — create a post. `title` required.
 */
export async function POST(request: NextRequest) {
  const user = await checkAdminAndPublicOwner();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { title, slug, excerpt, content, published } =
    body as Record<string, unknown>;

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  let post;
  try {
    post = await createPost({
      title,
      slug: typeof slug === 'string' ? slug : undefined,
      excerpt: typeof excerpt === 'string' ? excerpt : undefined,
      content: typeof content === 'string' ? content : undefined,
      published: typeof published === 'boolean' ? published : false,
      authorId: user.id,
    });
  } catch (error) {
    if (isUniqueSlugConflict(error)) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json({ post: serializeAdminPost(post) }, { status: 201 });
}
