import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isSubscriber } from '@/lib/subscription/is-subscriber';
import Link from 'next/link';
import CreateFolderForm from '@/components/documents/CreateFolderForm';

export default async function NewFolderPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!isSubscriber(user.customerStatus)) {
    redirect('/documents');
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <Link href="/documents">Documents</Link>
            </li>
            <li className="breadcrumb-item active">New Folder</li>
          </ol>
        </nav>
        <CreateFolderForm />
      </div>
    </div>
  );
}
