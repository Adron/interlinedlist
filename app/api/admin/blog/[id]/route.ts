import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAndPublicOwner } from '@/lib/auth/admin-access';
import {
  deletePost,
  getPostByIdForAdmin,
  isUniqueSlugConflict,
  serializeAdminPost,
  updatePost,
  type UpdatePostInput,
} from '@/lib/blog/queries';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/admin/blog/[id] — fetch a single post (drafts included).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const user = await checkAdminAndPublicOwner();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await Promise.resolve(params);
  const post = await getPostByIdForAdmin(id);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ post: serializeAdminPost(post) });
}

/**
 * PATCH /api/admin/blog/[id] — partial update
 * (title/slug/excerpt/content/published).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await checkAdminAndPublicOwner();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await Promise.resolve(params);

  const existing = await getPostByIdForAdmin(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const patch: UpdatePostInput = {};

  if (raw.title !== undefined) {
    if (typeof raw.title !== 'string' || !raw.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    patch.title = raw.title;
  }
  if (raw.slug !== undefined) {
    if (typeof raw.slug !== 'string') {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }
    patch.slug = raw.slug;
  }
  if (raw.excerpt !== undefined) {
    if (typeof raw.excerpt !== 'string') {
      return NextResponse.json({ error: 'Invalid excerpt' }, { status: 400 });
    }
    patch.excerpt = raw.excerpt;
  }
  if (raw.content !== undefined) {
    if (typeof raw.content !== 'string') {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }
    patch.content = raw.content;
  }
  if (raw.published !== undefined) {
    if (typeof raw.published !== 'boolean') {
      return NextResponse.json({ error: 'Invalid published' }, { status: 400 });
    }
    patch.published = raw.published;
  }

  let post;
  try {
    post = await updatePost(id, patch);
  } catch (error) {
    if (isUniqueSlugConflict(error)) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 409 }
      );
    }
    throw error;
  }
  return NextResponse.json({ post: serializeAdminPost(post) });
}

/**
 * DELETE /api/admin/blog/[id] — delete a post.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await checkAdminAndPublicOwner();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await Promise.resolve(params);

  const existing = await getPostByIdForAdmin(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await deletePost(id);
  return NextResponse.json({ success: true });
}
