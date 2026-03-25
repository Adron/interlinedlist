import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isSubscriber } from '@/lib/subscription/is-subscriber';
import Link from 'next/link';
import DocumentList from '@/components/documents/DocumentList';
import { prisma } from '@/lib/prisma';

export default async function DocumentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const rootDocuments = await prisma.document.findMany({
    where: { userId: user.id, folderId: null, deletedAt: null },
    orderBy: { relativePath: 'asc' },
  });

  return (
    <>
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1 className="h3 mb-0">
            <i className="bx bx-note me-2"></i>
            Documents
          </h1>
          <div className="d-flex gap-2 align-items-center">
            {isSubscriber(user.customerStatus) ? (
              <>
                <Link href="/documents/new" className="btn btn-primary">
                  <i className="bx bx-plus me-2"></i>
                  New Document
                </Link>
                <Link href="/documents/folders/new" className="btn btn-outline-primary">
                  <i className="bx bx-folder-plus me-2"></i>
                  New Folder
                </Link>
              </>
            ) : (
              <>
                <span className="text-muted small">Subscribe to create documents.</span>
                <Link href="/subscription" className="btn btn-outline-primary btn-sm">
                  Upgrade
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <h5 className="h6 text-muted mb-3">Root documents</h5>
      <DocumentList documents={rootDocuments} />
    </>
  );
}
