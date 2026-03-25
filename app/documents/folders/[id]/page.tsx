import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isSubscriber } from '@/lib/subscription/is-subscriber';
import Link from 'next/link';
import DocumentList from '@/components/documents/DocumentList';
import { getFolderById } from '@/lib/documents/queries';

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const folder = await getFolderById(resolvedParams.id, user.id);

  if (!folder) {
    notFound();
  }

  return (
    <>
      <div className="row mb-4">
        <div className="col-12">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link href="/documents">Documents</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {folder.name}
              </li>
            </ol>
          </nav>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h3 mb-0">
              <i className="bx bx-folder me-2 text-warning"></i>
              {folder.name}
            </h1>
            {isSubscriber(user.customerStatus) ? (
              <Link
                href={`/documents/folders/${folder.id}/new`}
                className="btn btn-primary"
              >
                <i className="bx bx-plus me-2"></i>
                New Document
              </Link>
            ) : (
              <Link href="/subscription" className="btn btn-outline-primary btn-sm">
                Subscribe to create documents
              </Link>
            )}
          </div>
        </div>
      </div>

      <h5 className="h6 text-muted mb-3">Documents</h5>
      <DocumentList documents={folder.documents} folderId={folder.id} />
    </>
  );
}
