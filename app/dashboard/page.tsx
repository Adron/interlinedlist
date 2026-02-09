import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import DashboardMessageFeed from '@/components/DashboardMessageFeed';
import ListsTreeView from '@/components/ListsTreeView';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is the Owner of "The Public" organization
  let showArchitectureAggregates = false;
  try {
    const { prisma } = await import('@/lib/prisma');
    const publicOrg = await prisma.organization.findFirst({
      where: {
        name: 'The Public',
        deletedAt: null,
      },
    });
    if (publicOrg) {
      const userRole = await getUserRoleInOrganization(publicOrg.id, user.id);
      if (userRole === 'owner') {
        showArchitectureAggregates = true;
      }
    }
  } catch (error) {
    // If organization doesn't exist or error occurs, don't show the button
    console.error('Error checking The Public organization permissions:', error);
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-3">
        <div className="col-12">
          <EmailVerificationBanner emailVerified={user.emailVerified} />
        </div>
      </div>

      <div className="row">
        {/* Left Column - Messages Table */}
        <div className="col-lg-8 mb-4">
          <DashboardMessageFeed />
        </div>

        {/* Right Column - Data Management and Profile Information */}
        <div className="col-lg-4 col-12 mb-4 order-lg-2">
          {/* Data Management Section */}
          <div className="card mb-3">
            <div className="card-body">
              <h4 className="h6 mb-3">Data Management</h4>
              <div className="d-flex gap-2 flex-wrap">
                <Link
                  href="/exports"
                  className="btn btn-outline-primary btn-sm"
                  title="Exports"
                >
                  <i className="bx bx-download me-1"></i>
                  Exports
                </Link>
                <Link
                  href="/settings"
                  className="btn btn-outline-secondary btn-sm"
                  title="Settings"
                >
                  <i className="bx bx-cog me-1"></i>
                  Settings
                </Link>
                {showArchitectureAggregates && (
                  <Link
                    href="/architecture-aggregates"
                    className="btn btn-outline-info btn-sm"
                    title="Architecture Aggregates"
                  >
                    <i className="bx bx-network-chart me-1"></i>
                    Architecture Aggregates
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="card mb-3">
            <div className="card-body">
              <h4 className="h6 mb-3">Profile Information</h4>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <strong>Display Name:</strong>
                  <br />
                  <span className="text-muted">{user.displayName || 'Not set'}</span>
                </li>
                <li className="mb-2">
                  <strong>Email:</strong>
                  <br />
                  <span className="text-muted">{user.email}</span>
                </li>
                <li className="mb-2">
                  <strong>Email Verified:</strong>
                  <br />
                  <span className={user.emailVerified ? 'text-success' : 'text-warning'}>
                    {user.emailVerified ? '✓ Yes' : '✗ No'}
                  </span>
                </li>
                <li className="mb-0">
                  <strong>Member Since:</strong>
                  <br />
                  <span className="text-muted">{new Date(user.createdAt).toLocaleDateString()}</span>
                </li>
              </ul>
            </div>
          </div>

          <ListsTreeView />
        </div>
      </div>
    </div>
  );
}

