import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import Link from 'next/link';
import FolderTree from '@/components/documents/FolderTree';
import DocumentEditor from '@/components/documents/DocumentEditor';
import { getDocumentById } from '@/lib/documents/queries';

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const document = await getDocumentById(resolvedParams.id, user.id);

  if (!document) {
    notFound();
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-3">
        <div className="col-12">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link href="/documents">Documents</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {document.title}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4 col-lg-3 mb-4">
          <FolderTree />
        </div>
        <div className="col-md-8 col-lg-9">
          <DocumentEditor
            documentId={document.id}
            initialTitle={document.title}
            initialContent={document.content}
            initialIsPublic={document.isPublic}
          />
        </div>
      </div>
    </div>
  );
}
