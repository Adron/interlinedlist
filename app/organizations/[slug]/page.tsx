import { getCurrentUser } from '@/lib/auth/session';
import {
  getOrganizationBySlug,
  getUserRoleInOrganization,
  getOrganizationMembers,
} from '@/lib/organizations/queries';
import OrganizationCard from '@/components/organizations/OrganizationCard';
import OrganizationMembers from '@/components/organizations/OrganizationMembers';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OrganizationDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const user = await getCurrentUser();

  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    notFound();
  }

  // Check if user can view organization
  if (!organization.isPublic && !user) {
    return (
      <div className="container-fluid container-fluid-max py-4">
        <div className="alert alert-warning">
          This organization is private. You must be a member to view it.
        </div>
      </div>
    );
  }

  // Get user's role if authenticated
  let userRole = null;
  let canManage = false;
  if (user) {
    userRole = await getUserRoleInOrganization(organization.id, user.id);
    canManage = userRole === 'owner' || userRole === 'admin';
  }

  // If private and user is not a member, show error
  if (!organization.isPublic && !userRole) {
    return (
      <div className="container-fluid container-fluid-max py-4">
        <div className="alert alert-warning">
          This organization is private. You must be a member to view it.
        </div>
      </div>
    );
  }

  // Get member count
  const membersResult = await getOrganizationMembers(organization.id, { limit: 1 });
  const memberCount = membersResult.pagination.total;

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <div className="col-lg-8">
          <div className="mb-3">
            <Link href="/organizations" className="text-decoration-none">
              <i className="bx bx-arrow-back me-1"></i>
              Back to Organizations
            </Link>
          </div>

          <OrganizationCard
            organization={{
              ...organization,
              role: userRole || undefined,
              memberCount,
            }}
            showActions={false}
          />

          {canManage && (
            <div className="card mb-3">
              <div className="card-body">
                <h5 className="card-title">Organization Settings</h5>
                <p className="text-muted">
                  Organization management features coming soon.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <OrganizationMembers
            organizationId={organization.id}
            currentUserRole={userRole}
            canManage={canManage}
          />
        </div>
      </div>
    </div>
  );
}
