import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import Link from 'next/link';
import FolderTree from '@/components/documents/FolderTree';
import DocumentList from '@/components/documents/DocumentList';
import { prisma } from '@/lib/prisma';

export default async function DocumentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [folders, rootDocuments] = await Promise.all([
    prisma.folder.findMany({
      where: { userId: user.id, parentId: null, deletedAt: null },
      include: {
        children: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
        documents: { where: { deletedAt: null }, orderBy: { relativePath: 'asc' } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.document.findMany({
      where: { userId: user.id, folderId: null, deletedAt: null },
      orderBy: { relativePath: 'asc' },
    }),
  ]);

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1 className="h3 mb-0">
            <i className="bx bx-note me-2"></i>
            Documents
          </h1>
          <div className="d-flex gap-2">
            <Link href="/documents/new" className="btn btn-primary">
              <i className="bx bx-plus me-2"></i>
              New Document
            </Link>
            <Link href="/documents/folders/new" className="btn btn-outline-primary">
              <i className="bx bx-folder-plus me-2"></i>
              New Folder
            </Link>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4 col-lg-3 mb-4">
          <FolderTree />
        </div>
        <div className="col-md-8 col-lg-9">
          <h5 className="h6 text-muted mb-3">Root documents</h5>
          <DocumentList documents={rootDocuments} />
        </div>
      </div>
    </div>
  );
}
