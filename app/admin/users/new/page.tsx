import AddUserForm from './AddUserForm';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
<<<<<<< HEAD
<<<<<<< HEAD
import { requireAdminAndPublicOwner } from '@/lib/auth/admin-access';
=======
>>>>>>> 02fe833 (All these things are supposedly going to fix the amil send!)

export default async function AddUserPage() {
  await requireAdminAndPublicOwner();

  const breadcrumbItems = [
    { label: 'Administration', href: '/admin' },
    { label: 'Add User' },
  ];
=======
import { requireAdminAndPublicOwner } from '@/lib/auth/admin-access';

export default async function AddUserPage() {
  await requireAdminAndPublicOwner();
>>>>>>> 6dad121 (admin and related changes.)

  const breadcrumbItems = [
    { label: 'Administration', href: '/admin' },
    { label: 'Add User' },
  ];

  return (
    <div className="container-fluid container-fluid-max py-4">
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
    </div>
  );
}
