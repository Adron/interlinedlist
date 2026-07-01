import AddUserForm from './AddUserForm';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
import { requireAdminAndPublicOwner } from '@/lib/auth/admin-access';

export default async function AddUserPage() {
  await requireAdminAndPublicOwner();

  const breadcrumbItems = [
    { label: 'Administration', href: '/admin' },
    { label: 'Add User' },
  ];

  return (
    <>
      <ListBreadcrumbs items={breadcrumbItems} />
      <div className="row mb-4">
        <div className="col-12">
          <a href="/admin" className="btn btn-outline-secondary">
            <i className="bx bx-arrow-back me-2"></i>Back
          </a>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <AddUserForm />
        </div>
      </div>
    </>
  );
}
