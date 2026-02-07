import { getCurrentUser } from '@/lib/auth/session';
import CreateOrganizationForm from '@/components/organizations/CreateOrganizationForm';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewOrganizationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <div className="col-lg-8 col-md-10 mx-auto">
          <h1 className="mb-4">Create Organization</h1>
          <CreateOrganizationForm />
        </div>
      </div>
    </div>
  );
}
