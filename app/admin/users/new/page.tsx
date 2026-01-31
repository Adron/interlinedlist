import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import AddUserForm from './AddUserForm';

export default async function AddUserPage() {
  const user = await getCurrentUser();

  // Redirect if not logged in
  if (!user) {
    redirect('/login');
  }

  // Redirect if not administrator
  if (!user.isAdministrator) {
    redirect('/dashboard');
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center gap-3 mb-3">
            <a href="/admin" className="btn btn-outline-secondary">
              <i className="bx bx-arrow-back me-2"></i>Back
            </a>
            <div>
              <h1 className="h2 mb-0">Add New User</h1>
              <p className="text-muted mb-0">Create a new user account</p>
            </div>
          </div>
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
