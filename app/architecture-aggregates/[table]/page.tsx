import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import TableDataGrid from '@/components/architecture-aggregates/TableDataGrid';

interface PageProps {
  params: Promise<{ table: string }>;
}

const TABLE_CONFIG: Record<string, { displayName: string; description: string; icon: string }> = {
  users: {
    displayName: 'Users',
    description: 'User accounts and profiles',
    icon: 'bx-user',
  },
  messages: {
    displayName: 'Messages',
    description: 'User messages and posts',
    icon: 'bx-message',
  },
  lists: {
    displayName: 'Lists',
    description: 'User-created lists',
    icon: 'bx-list-ul',
  },
  list_properties: {
    displayName: 'List Properties',
    description: 'Schema definitions for list fields',
    icon: 'bx-cog',
  },
  list_data_rows: {
    displayName: 'List Data Rows',
    description: 'Data rows within lists',
    icon: 'bx-table',
  },
  administrators: {
    displayName: 'Administrators',
    description: 'System administrators',
    icon: 'bx-shield',
  },
  organizations: {
    displayName: 'Organizations',
    description: 'User organizations',
    icon: 'bx-group',
  },
  user_organizations: {
    displayName: 'User Organizations',
    description: 'User membership in organizations',
    icon: 'bx-user-check',
  },
  follows: {
    displayName: 'Follows',
    description: 'User follow relationships',
    icon: 'bx-user-plus',
  },
};

export default async function TableDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { table } = await params;

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

  // Validate table name
  if (!TABLE_CONFIG[table]) {
    redirect('/architecture-aggregates');
  }

  const tableConfig = TABLE_CONFIG[table];

  // Get row count
  let rowCount = 0;
  try {
    switch (table) {
      case 'users':
        rowCount = await prisma.user.count();
        break;
      case 'messages':
        rowCount = await prisma.message.count();
        break;
      case 'lists':
        rowCount = await prisma.list.count({ where: { deletedAt: null } });
        break;
      case 'list_properties':
        rowCount = await prisma.listProperty.count();
        break;
      case 'list_data_rows':
        rowCount = await prisma.listDataRow.count({ where: { deletedAt: null } });
        break;
      case 'administrators':
        rowCount = await prisma.administrator.count();
        break;
      case 'organizations':
        rowCount = await prisma.organization.count({ where: { deletedAt: null } });
        break;
      case 'user_organizations':
        rowCount = await prisma.userOrganization.count();
        break;
      case 'follows':
        rowCount = await prisma.follow.count();
        break;
    }
  } catch (error) {
    console.error('Error getting row count:', error);
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center gap-3 mb-3">
            <Link href="/architecture-aggregates" className="btn btn-outline-secondary btn-sm">
              <i className="bx bx-arrow-back me-1"></i>
              Back to Architecture
            </Link>
            <div className="flex-grow-1">
              <h1 className="h3 mb-1">
                <i className={`bx ${tableConfig.icon} me-2`}></i>
                {tableConfig.displayName}
              </h1>
              <p className="text-muted mb-0">{tableConfig.description}</p>
            </div>
            <div className="text-end">
              <span className="badge bg-primary fs-6">
                {rowCount.toLocaleString()} total rows
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Table Data (Read-Only)</h5>
            </div>
            <div className="card-body">
              <TableDataGrid tableName={table} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
