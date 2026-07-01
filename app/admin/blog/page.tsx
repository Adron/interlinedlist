import { requireAdminAndPublicOwner } from '@/lib/auth/admin-access';
import { listAllPostsForAdmin, serializeAdminPost } from '@/lib/blog/queries';
import BlogManager from '@/components/admin/BlogManager';

export default async function BlogAdminPage() {
  await requireAdminAndPublicOwner();

  const posts = await listAllPostsForAdmin();
  const initialPosts = posts.map(serializeAdminPost);

  return (
    <>
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h4 mb-0">Blogging</h1>
          <p className="text-muted small mb-0">
            Create, edit, publish, and delete posts for the public blog.
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <BlogManager initialPosts={initialPosts} />
        </div>
      </div>
    </>
  );
}
