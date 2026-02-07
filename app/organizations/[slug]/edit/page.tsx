import { getCurrentUser } from '@/lib/auth/session';
import {
  getOrganizationBySlug,
  getUserRoleInOrganization,
  getOrganizationMembers,
} from '@/lib/organizations/queries';
import EditOrganizationForm from '@/components/organizations/EditOrganizationForm';
import OrganizationMembersManagement from '@/components/organizations/OrganizationMembersManagement';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EditOrganizationPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    notFound();
  }

  // Check if user is owner or admin
  const userRole = await getUserRoleInOrganization(organization.id, user.id);

  if (userRole !== 'owner' && userRole !== 'admin') {
    return (
      <div className="container-fluid container-fluid-max py-4">
        <div className="alert alert-warning">
          You must be the owner or admin of this organization to edit it.
        </div>
        <Link href={`/organizations/${slug}`} className="btn btn-secondary">
          Back to Organization
        </Link>
      </div>
    );
  }

  // Fetch existing member IDs to exclude from user selection
  const membersResult = await getOrganizationMembers(organization.id, {
    limit: 10000, // Get all members
    offset: 0,
  });
  const existingMemberIds = membersResult.members.map((m) => m.id);

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <div className="col-lg-8 col-md-10 mx-auto">
          <div className="mb-3">
            <Link href={`/organizations/${slug}`} className="text-decoration-none">
              <i className="bx bx-arrow-back me-1"></i>
              Back to Organization
            </Link>
          </div>

          <h1 className="mb-4">Edit Organization</h1>
          <EditOrganizationForm organization={organization} />

          <OrganizationMembersManagement
            organizationId={organization.id}
            existingMemberIds={existingMemberIds}
            currentUserRole={userRole}
          />
        </div>
      </div>
    </div>
  );
}
