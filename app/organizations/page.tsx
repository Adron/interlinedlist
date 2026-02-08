import { getCurrentUser } from '@/lib/auth/session';
import { getPublicOrganizations, getUserOrganizations } from '@/lib/organizations/queries';
import OrganizationList from '@/components/organizations/OrganizationList';
import { redirect } from 'next/navigation';
import { Organization, OrganizationRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

type OrganizationWithMembership = Organization & {
  role?: OrganizationRole;
  memberCount?: number;
};

export default async function OrganizationsPage() {
  const user = await getCurrentUser();

  // Get public organizations for display
  const publicOrgsResult = await getPublicOrganizations({ limit: 50, offset: 0 });
  const publicOrganizations: OrganizationWithMembership[] = publicOrgsResult.organizations.map((org) => ({
    ...org,
    memberCount: undefined, // Will be fetched client-side if needed
  }));

  // If user is logged in, get their organizations (including private ones)
  let userOrganizationsMap: Map<string, 'owner' | 'admin' | 'member'> = new Map();
  let userPrivateOrganizations: OrganizationWithMembership[] = [];
  
  if (user) {
    const userOrgs = await getUserOrganizations(user.id);
    userOrgs.forEach((org) => {
      userOrganizationsMap.set(org.id, org.role);
    });
    
    // Get private organizations that the user is a member of
    userPrivateOrganizations = userOrgs
      .filter((org) => !org.isPublic)
      .map((org) => ({
        ...org,
        memberCount: undefined,
        role: org.role,
      }));
  }

  // Combine public organizations with user's private organizations
  // Use a Map to avoid duplicates
  const allOrganizationsMap = new Map<string, OrganizationWithMembership>();
  
  // Add public organizations
  publicOrganizations.forEach((org) => {
    allOrganizationsMap.set(org.id, {
      ...org,
      role: userOrganizationsMap.get(org.id),
    });
  });
  
  // Add user's private organizations (will overwrite if already in map, but that's fine)
  userPrivateOrganizations.forEach((org) => {
    allOrganizationsMap.set(org.id, org);
  });

  const organizationsWithMembership = Array.from(allOrganizationsMap.values());

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">Organizations</h1>
          <OrganizationList
            initialOrganizations={organizationsWithMembership}
            showCreateButton={!!user}
            filterPublic={false}
          />
        </div>
      </div>
    </div>
  );
}
