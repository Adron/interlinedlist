import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  updateUserRole,
  removeUserFromOrganization,
} from '@/lib/organizations/queries';
import { OrganizationRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = params;
    const body = await request.json();
    const { role, active } = body;

    // Role is required, active is optional
    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role (owner, admin, or member) is required' },
        { status: 400 }
      );
    }

    const membership = await updateUserRole(
      id,
      userId,
      role as OrganizationRole,
      user.id,
      active !== undefined ? active : undefined
    );

    return NextResponse.json({
      message: 'Member role updated successfully',
      membership,
    });
  } catch (error: any) {
    console.error('Error updating member role:', error);
    
    if (error.message?.includes('not a member')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error.message?.includes('permission') || error.message?.includes('Insufficient')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message?.includes('last owner')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = params;

    const membership = await removeUserFromOrganization(id, userId, user.id);

    return NextResponse.json({
      message: 'Member removed from organization successfully',
      membership,
    });
  } catch (error: any) {
    console.error('Error removing member from organization:', error);
    
    if (error.message?.includes('not a member')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error.message?.includes('permission') || error.message?.includes('Insufficient')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message?.includes('last owner')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
