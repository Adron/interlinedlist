import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getOrganizationMembers,
  addUserToOrganization,
  getUserRoleInOrganization,
} from '@/lib/organizations/queries';
import { OrganizationRole } from '@/lib/types';

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
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const role = searchParams.get('role') as OrganizationRole | null;

    // Check if user is a member of the organization
    const userRole = await getUserRoleInOrganization(id, user.id);
    if (!userRole) {
      return NextResponse.json(
        { error: 'You must be a member of this organization to view members' },
        { status: 403 }
      );
    }

    const result = await getOrganizationMembers(id, {
      limit,
      offset,
      role: role || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role && !['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be owner, admin, or member' },
        { status: 400 }
      );
    }

    const membership = await addUserToOrganization(
      id,
      userId,
      (role as OrganizationRole) || 'member',
      user.id
    );

    return NextResponse.json(
      {
        message: 'User added to organization successfully',
        membership,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding member to organization:', error);
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (error.message?.includes('already a member')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error.message?.includes('permission') || error.message?.includes('Insufficient')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
