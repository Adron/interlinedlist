import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
import CreateListForm from './CreateListForm';

export default async function NewListPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!user.cleared) {
    redirect('/lists');
  }

  const breadcrumbItems = [
    { label: 'Lists', href: '/lists' },
    { label: 'New List' },
  ];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <ListBreadcrumbs items={breadcrumbItems} />
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <CreateListForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
