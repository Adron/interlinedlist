import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isSubscriber } from '@/lib/subscription/is-subscriber';
import Link from 'next/link';
import CreateFolderForm from '@/components/documents/CreateFolderForm';
import { getFolderById } from '@/lib/documents/queries';

export default async function NewSubfolderPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isSubscriber(user.customerStatus)) redirect(`/documents/folders/${resolvedParams.id}`);

  const folder = await getFolderById(resolvedParams.id, user.id);
  if (!folder) notFound();

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link href="/documents">Documents</Link></li>
            <li className="breadcrumb-item">
              <Link href={`/documents/folders/${folder.id}`}>{folder.name}</Link>
            </li>
            <li className="breadcrumb-item active">New Subfolder</li>
          </ol>
        </nav>
        <CreateFolderForm parentId={folder.id} cancelHref={`/documents/folders/${folder.id}`} />
      </div>
    </div>
  );
}
