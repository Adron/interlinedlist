import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import CreateListForm from './CreateListForm';

export default async function NewListPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">Create New List</h1>
          <p className="text-muted">Define your list schema using the DSL form builder</p>
        </div>
      </div>

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
