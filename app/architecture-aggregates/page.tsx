import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import ERDDiagram from '@/components/architecture-aggregates/ERDDiagram';
import ArchitectureTabs from '@/components/architecture-aggregates/ArchitectureTabs';
import { getERDData } from '@/lib/architecture-aggregates/schema-parser';

export default async function ArchitectureAggregatesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is Owner of "The Public" organization
  let hasAccess = false;
  try {
    const publicOrg = await prisma.organization.findFirst({
      where: {
        name: 'The Public',
        deletedAt: null,
      },
    });
    if (publicOrg) {
      const userRole = await getUserRoleInOrganization(publicOrg.id, user.id);
      if (userRole === 'owner') {
        hasAccess = true;
      }
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
  }

  if (!hasAccess) {
    redirect('/dashboard');
  }

  // Get row counts for all tables
  const [
    usersCount,
    messagesCount,
    listsCount,
    listPropertiesCount,
    listDataRowsCount,
    administratorsCount,
    organizationsCount,
    userOrganizationsCount,
    followsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.message.count(),
    prisma.list.count({ where: { deletedAt: null } }),
    prisma.listProperty.count(),
    prisma.listDataRow.count({ where: { deletedAt: null } }),
    prisma.administrator.count(),
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.userOrganization.count(),
    prisma.follow.count(),
  ]);

  const rowCounts = {
    users: usersCount,
    messages: messagesCount,
    lists: listsCount,
    list_properties: listPropertiesCount,
    list_data_rows: listDataRowsCount,
    administrators: administratorsCount,
    organizations: organizationsCount,
    user_organizations: userOrganizationsCount,
    follows: followsCount,
  };

  // Get ERD data
  const erdData = getERDData(rowCounts);

  const tables = [
    {
      name: 'users',
      displayName: 'Users',
      count: usersCount,
      description: 'User accounts and profiles',
      icon: 'bx-user',
    },
    {
      name: 'messages',
      displayName: 'Messages',
      count: messagesCount,
      description: 'User messages and posts',
      icon: 'bx-message',
    },
    {
      name: 'lists',
      displayName: 'Lists',
      count: listsCount,
      description: 'User-created lists',
      icon: 'bx-list-ul',
    },
    {
      name: 'list_properties',
      displayName: 'List Properties',
      count: listPropertiesCount,
      description: 'Schema definitions for list fields',
      icon: 'bx-cog',
    },
    {
      name: 'list_data_rows',
      displayName: 'List Data Rows',
      count: listDataRowsCount,
      description: 'Data rows within lists',
      icon: 'bx-table',
    },
    {
      name: 'administrators',
      displayName: 'Administrators',
      count: administratorsCount,
      description: 'System administrators',
      icon: 'bx-shield',
    },
    {
      name: 'organizations',
      displayName: 'Organizations',
      count: organizationsCount,
      description: 'User organizations',
      icon: 'bx-group',
    },
    {
      name: 'user_organizations',
      displayName: 'User Organizations',
      count: userOrganizationsCount,
      description: 'User membership in organizations',
      icon: 'bx-user-check',
    },
    {
      name: 'follows',
      displayName: 'Follows',
      count: followsCount,
      description: 'User follow relationships',
      icon: 'bx-user-plus',
    },
  ];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center gap-3 mb-3">
            <Link href="/dashboard" className="btn btn-outline-secondary btn-sm">
              <i className="bx bx-arrow-back me-1"></i>
              Back to Dashboard
            </Link>
            <h1 className="h3 mb-0">Architecture Aggregates</h1>
          </div>
          <p className="text-muted">
            Database schema overview with row counts. Click on any table to view details and data.
          </p>
        </div>
      </div>

      <ArchitectureTabs
        tableView={
          <>
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Database Schema</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      {tables.map((table) => (
                        <div key={table.name} className="col-md-6 col-lg-4">
                          <Link
                            href={`/architecture-aggregates/${table.name}`}
                            className="text-decoration-none"
                          >
                            <div className="card h-100 border shadow-sm architecture-table-card">
                              <div className="card-body">
                                <div className="d-flex align-items-start mb-2">
                                  <div className="flex-shrink-0">
                                    <div className="bg-info bg-opacity-10 rounded p-2">
                                      <i className={`bx ${table.icon} fs-5 text-info`}></i>
                                    </div>
                                  </div>
                                  <div className="flex-grow-1 ms-3">
                                    <h6 className="card-title mb-1">{table.displayName}</h6>
                                    <p className="card-text text-muted small mb-0">{table.description}</p>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <span className="badge bg-primary">
                                    {table.count.toLocaleString()} rows
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Summary Statistics</h5>
                  </div>
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-md-3 col-6 mb-3">
                        <div className="p-3 bg-light rounded">
                          <div className="fs-4 fw-bold text-primary">{usersCount.toLocaleString()}</div>
                          <div className="text-muted small">Total Users</div>
                        </div>
                      </div>
                      <div className="col-md-3 col-6 mb-3">
                        <div className="p-3 bg-light rounded">
                          <div className="fs-4 fw-bold text-success">{messagesCount.toLocaleString()}</div>
                          <div className="text-muted small">Total Messages</div>
                        </div>
                      </div>
                      <div className="col-md-3 col-6 mb-3">
                        <div className="p-3 bg-light rounded">
                          <div className="fs-4 fw-bold text-info">{listsCount.toLocaleString()}</div>
                          <div className="text-muted small">Total Lists</div>
                        </div>
                      </div>
                      <div className="col-md-3 col-6 mb-3">
                        <div className="p-3 bg-light rounded">
                          <div className="fs-4 fw-bold text-warning">{listDataRowsCount.toLocaleString()}</div>
                          <div className="text-muted small">Total Data Rows</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        }
        erdView={
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Entity Relationship Diagram</h5>
                </div>
                <div className="card-body">
                  <ERDDiagram nodes={erdData.nodes} edges={erdData.edges} />
                </div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
