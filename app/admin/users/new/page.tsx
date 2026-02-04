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
