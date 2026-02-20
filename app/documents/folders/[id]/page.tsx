import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import Link from 'next/link';
import FolderTree from '@/components/documents/FolderTree';
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
    <div className="container-fluid container-fluid-max py-4">
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
            <Link
              href={`/documents/folders/${folder.id}/new`}
              className="btn btn-primary"
            >
              <i className="bx bx-plus me-2"></i>
              New Document
            </Link>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4 col-lg-3 mb-4">
          <FolderTree />
        </div>
        <div className="col-md-8 col-lg-9">
          <h5 className="h6 text-muted mb-3">Documents</h5>
          <DocumentList documents={folder.documents} folderId={folder.id} />
        </div>
      </div>
    </div>
  );
}
