import { getCurrentUser } from '@/lib/auth/session';
import UserOrganizations from '@/components/organizations/UserOrganizations';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function UserOrganizationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">My Organizations</h1>
          <UserOrganizations />
        </div>
      </div>
    </div>
  );
}
