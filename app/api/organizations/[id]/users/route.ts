import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';
    const excludeMembersParam = searchParams.get('excludeMembers') || '';

    // Check if user is owner of the organization
    const userRole = await getUserRoleInOrganization(id, user.id);
    if (userRole !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can search for users to add' },
        { status: 403 }
      );
    }

    // Get existing member IDs to exclude
    const excludeMemberIds: string[] = [];
    if (excludeMembersParam) {
      excludeMemberIds.push(...excludeMembersParam.split(',').filter(Boolean));
    } else {
      // If not provided, fetch all current members
      const members = await prisma.userOrganization.findMany({
        where: { organizationId: id },
        select: { userId: true },
      });
      excludeMemberIds.push(...members.map((m) => m.userId));
    }

    // Build where clause
    const where: Prisma.UserWhereInput = {
      // Exclude existing members
      ...(excludeMemberIds.length > 0
        ? {
            id: {
              notIn: excludeMemberIds,
            },
          }
        : {}),
      // Search filter
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Fetch users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatar: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    // Serialize dates
    const serializedUsers = users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({
      users: serializedUsers,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching users for organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
