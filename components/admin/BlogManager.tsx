'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  published: boolean;
  publishedAt: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BlogManagerProps {
  initialPosts: AdminBlogPost[];
}

// Same markdown component mapping used by app/blog/[slug]/page.tsx so the
// preview matches the rendered post exactly.
const MARKDOWN_COMPONENTS = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href ?? '#'} className="text-primary">
      {children}
    </a>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="help-pre">{children}</pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="help-table-wrapper">
      <table className="help-table">{children}</table>
    </div>
  ),
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface FormState {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  published: boolean;
  slugTouched: boolean;
}

const EMPTY_FORM: FormState = {
  id: null,
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  published: false,
  slugTouched: false,
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString();
}

export default function BlogManager({ initialPosts }: BlogManagerProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<AdminBlogPost[]>(initialPosts);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  function startNew() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(post: AdminBlogPost) {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      published: post.published,
      slugTouched: true,
    });
    setError(null);
  }

  function onTitleChange(value: string) {
    setForm((f) => ({
      ...f,
      title: value,
      slug: f.slugTouched ? f.slug : slugify(value),
    }));
  }

  function onSlugChange(value: string) {
    setForm((f) => ({ ...f, slug: value, slugTouched: true }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      content: form.content,
      published: form.published,
    };

    try {
      const res = form.id
        ? await fetch(`/api/admin/blog/${form.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Failed to save post.');
        return;
      }

      const saved = data.post as AdminBlogPost;
      startEdit(saved);
      router.refresh();
    } catch {
      setError('Network error while saving.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(post: AdminBlogPost) {
    if (
      !window.confirm(`Delete “${post.title}”? This cannot be undone.`)
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? 'Failed to delete post.');
        return;
      }
      if (form.id === post.id) startNew();
      router.refresh();
    } catch {
      setError('Network error while deleting.');
    }
  }

  async function togglePublished(post: AdminBlogPost) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !post.published }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Failed to update post.');
        return;
      }
      const saved = data.post as AdminBlogPost;
      if (form.id === saved.id) {
        setForm((f) => ({ ...f, published: saved.published }));
      }
      router.refresh();
    } catch {
      setError('Network error while updating.');
    }
  }

  return (
    <div className="row g-4">
      {/* Post list */}
      <div className="col-12 col-lg-4">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Posts</span>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={startNew}
            >
              <i className="bx bx-plus me-1" />
              New Post
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover table-sm align-middle mb-0">
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted py-4">No posts yet.</td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr
                      key={post.id}
                      className={form.id === post.id ? 'table-active' : ''}
                    >
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-semibold">{post.title}</span>
                          <span className="d-flex align-items-center gap-2 mt-1">
                            <span
                              className={`badge ${
                                post.published ? 'bg-success' : 'bg-secondary'
                              }`}
                            >
                              {post.published ? 'Published' : 'Draft'}
                            </span>
                            <span className="text-muted small">
                              {formatDate(post.updatedAt)}
                            </span>
                          </span>
                          <span className="mt-2 d-flex gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => startEdit(post)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(post)}
                            >
                              Delete
                            </button>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Editor + preview */}
      <div className="col-12 col-lg-8">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <span className="fw-semibold">
              {form.id ? 'Edit Post' : 'New Post'}
            </span>
            {form.id && (
              <button
                type="button"
                className={`btn btn-sm ${
                  form.published ? 'btn-outline-warning' : 'btn-outline-success'
                }`}
                onClick={() => {
                  const current = posts.find((p) => p.id === form.id);
                  if (current) togglePublished(current);
                }}
              >
                {form.published ? 'Unpublish' : 'Publish'}
              </button>
            )}
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger py-2 small" role="alert">
                {error}
              </div>
            )}

            <div className="mb-3">
              <label className="form-label" htmlFor="blog-title">
                Title
              </label>
              <input
                id="blog-title"
                type="text"
                className="form-control"
                value={form.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Post title"
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="blog-slug">
                Slug
              </label>
              <input
                id="blog-slug"
                type="text"
                className="form-control"
                value={form.slug}
                onChange={(e) => onSlugChange(e.target.value)}
                placeholder="post-slug"
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="blog-excerpt">
                Excerpt <span className="text-muted small">(optional)</span>
              </label>
              <textarea
                id="blog-excerpt"
                className="form-control"
                rows={2}
                value={form.excerpt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, excerpt: e.target.value }))
                }
                placeholder="Auto-derived from content when left blank."
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="blog-content">
                Content <span className="text-muted small">(markdown)</span>
              </label>
              <textarea
                id="blog-content"
                className="form-control font-monospace"
                rows={12}
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder="Write your post in markdown…"
              />
            </div>

            <div className="form-check form-switch mb-3">
              <input
                id="blog-published"
                type="checkbox"
                className="form-check-input"
                checked={form.published}
                onChange={(e) =>
                  setForm((f) => ({ ...f, published: e.target.checked }))
                }
              />
              <label className="form-check-label" htmlFor="blog-published">
                Published
              </label>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && (
                  <span className="spinner-border spinner-border-sm me-2" />
                )}
                {form.id ? 'Save Changes' : 'Create Post'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={startNew}
                disabled={saving}
              >
                {form.id ? 'Cancel' : 'Clear'}
              </button>
            </div>
          </div>
        </div>

        <div className="card mt-4">
          <div className="card-header fw-semibold">Live Preview</div>
          <div className="card-body">
            <h1 className="mb-3">{form.title || 'Untitled'}</h1>
            <div className="help-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MARKDOWN_COMPONENTS}
              >
                {form.content || '_Nothing to preview yet._'}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
