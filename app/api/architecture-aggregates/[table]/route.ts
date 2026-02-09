import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ table: string }>;
}

/**
 * GET /api/architecture-aggregates/[table]
 * Get paginated data from a database table (read-only, owner access only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { table } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    let data: any[] = [];
    let total = 0;

    // Fetch data based on table name
    switch (table) {
      case 'users':
        [data, total] = await Promise.all([
          prisma.user.findMany({
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.user.count(),
        ]);
        break;

      case 'messages':
        [data, total] = await Promise.all([
          prisma.message.findMany({
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          }),
          prisma.message.count(),
        ]);
        // Flatten user data
        data = data.map((msg) => ({
          ...msg,
          userId: msg.userId,
          userName: msg.user?.username || '',
          userDisplayName: msg.user?.displayName || '',
        }));
        break;

      case 'lists':
        [data, total] = await Promise.all([
          prisma.list.findMany({
            where: { deletedAt: null },
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          }),
          prisma.list.count({ where: { deletedAt: null } }),
        ]);
        // Flatten user data
        data = data.map((list) => ({
          ...list,
          userId: list.userId,
          userName: list.user?.username || '',
          userDisplayName: list.user?.displayName || '',
        }));
        break;

      case 'list_properties':
        [data, total] = await Promise.all([
          prisma.listProperty.findMany({
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
              list: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          }),
          prisma.listProperty.count(),
        ]);
        // Flatten list data
        data = data.map((prop) => ({
          ...prop,
          listId: prop.listId,
          listTitle: prop.list?.title || '',
        }));
        break;

      case 'list_data_rows':
        [data, total] = await Promise.all([
          prisma.listDataRow.findMany({
            where: { deletedAt: null },
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
              list: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          }),
          prisma.listDataRow.count({ where: { deletedAt: null } }),
        ]);
        // Flatten list data
        data = data.map((row) => ({
          ...row,
          listId: row.listId,
          listTitle: row.list?.title || '',
        }));
        break;

      case 'administrators':
        [data, total] = await Promise.all([
          prisma.administrator.findMany({
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  email: true,
                },
              },
            },
          }),
          prisma.administrator.count(),
        ]);
        // Flatten user data
        data = data.map((admin) => ({
          ...admin,
          userId: admin.userId,
          userName: admin.user?.username || '',
          userDisplayName: admin.user?.displayName || '',
          userEmail: admin.user?.email || '',
        }));
        break;

      case 'organizations':
        [data, total] = await Promise.all([
          prisma.organization.findMany({
            where: { deletedAt: null },
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.organization.count({ where: { deletedAt: null } }),
        ]);
        break;

      case 'user_organizations':
        [data, total] = await Promise.all([
          prisma.userOrganization.findMany({
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
          prisma.userOrganization.count(),
        ]);
        // Flatten related data
        data = data.map((uo) => ({
          ...uo,
          userId: uo.userId,
          userName: uo.user?.username || '',
          userDisplayName: uo.user?.displayName || '',
          organizationId: uo.organizationId,
          organizationName: uo.organization?.name || '',
        }));
        break;

      case 'follows':
        [data, total] = await Promise.all([
          prisma.follow.findMany({
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
              follower: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
              following: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          }),
          prisma.follow.count(),
        ]);
        // Flatten related data
        data = data.map((follow) => ({
          ...follow,
          followerId: follow.followerId,
          followerUsername: follow.follower?.username || '',
          followerDisplayName: follow.follower?.displayName || '',
          followingId: follow.followingId,
          followingUsername: follow.following?.username || '',
          followingDisplayName: follow.following?.displayName || '',
        }));
        break;

      default:
        return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Serialize dates and handle JSON fields
    const serializedData = data.map((row) => {
      const serialized: any = {};
      for (const [key, value] of Object.entries(row)) {
        // Skip relations that were flattened
        if (key === 'user' || key === 'list' || key === 'follower' || key === 'following' || key === 'organization') {
          continue;
        }
        if (value instanceof Date) {
          serialized[key] = value.toISOString();
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          serialized[key] = JSON.stringify(value);
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    });

    return NextResponse.json({
      data: serializedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Architecture aggregates error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
