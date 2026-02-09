import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';
import { prisma } from '@/lib/prisma';
import { getERDData } from '@/lib/architecture-aggregates/schema-parser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/architecture-aggregates/schema
 * Get ERD data from Prisma schema
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Owner of "The Public" organization
    const publicOrg = await prisma.organization.findFirst({
      where: {
        name: 'The Public',
        deletedAt: null,
      },
    });

    if (!publicOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const userRole = await getUserRoleInOrganization(publicOrg.id, user.id);
    if (userRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    const erdData = getERDData(rowCounts);

    return NextResponse.json(erdData);
  } catch (error: any) {
    console.error('Get ERD schema error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
