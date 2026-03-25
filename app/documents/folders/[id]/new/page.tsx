import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isSubscriber } from '@/lib/subscription/is-subscriber';
import { getFolderById } from '@/lib/documents/queries';
import Link from 'next/link';
import CreateDocumentInFolderForm from '@/components/documents/CreateDocumentInFolderForm';

export default async function NewDocumentInFolderPage({
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

  if (!isSubscriber(user.customerStatus)) {
    redirect(`/documents/folders/${resolvedParams.id}`);
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <Link href="/documents">Documents</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href={`/documents/folders/${resolvedParams.id}`}>{folder.name}</Link>
            </li>
            <li className="breadcrumb-item active">New Document</li>
          </ol>
        </nav>
        <CreateDocumentInFolderForm folderId={resolvedParams.id} />
      </div>
    </div>
  );
}
