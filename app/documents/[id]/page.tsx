import { unstable_noStore as noStore } from 'next/cache';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import Link from 'next/link';
import DocumentEditor from '@/components/documents/DocumentEditor';
import { getDocumentById } from '@/lib/documents/queries';

/** Avoid serving a stale RSC payload for this route after edits (client nav back must re-fetch). */
export const dynamic = 'force-dynamic';

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  noStore();

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
    <>
      <div className="row mb-3">
        <div className="col-12">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link href="/documents">Documents</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {document.title.trim() || document.relativePath}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <DocumentEditor
        key={document.id}
        documentId={document.id}
        initialTitle={document.title}
        initialContent={document.content}
        initialIsPublic={document.isPublic}
        initialRelativePath={document.relativePath}
      />
    </>
  );
}
