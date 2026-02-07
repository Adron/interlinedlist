import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getOrganizationById,
  getOrganizationBySlug,
  updateOrganization,
  deleteOrganization,
  getUserRoleInOrganization,
  getOrganizationMembers,
} from '@/lib/organizations/queries';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const user = await getCurrentUser();

    // Try to get by ID first, then by slug
    let organization = await getOrganizationById(id);
    if (!organization) {
      organization = await getOrganizationBySlug(id);
    }

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user can view organization
    // Public organizations can be viewed by anyone
    // Private organizations require membership
    if (!organization.isPublic) {
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const userRole = await getUserRoleInOrganization(organization.id, user.id);
      if (!userRole) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // Get member count
    const memberCount = await prisma.userOrganization.count({
      where: {
        organizationId: organization.id,
      },
    });

    // Get user's role if authenticated
    let userRole = null;
    if (user) {
      userRole = await getUserRoleInOrganization(organization.id, user.id);
    }

    return NextResponse.json({
      organization: {
        ...organization,
        memberCount,
        userRole,
      },
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { name, description, avatar, isPublic, settings } = body;

    const organization = await updateOrganization(id, user.id, {
      name,
      description,
      avatar,
      isPublic,
      settings,
    });

    return NextResponse.json({
      message: 'Organization updated successfully',
      organization,
    });
  } catch (error: any) {
    console.error('Error updating organization:', error);
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (error.message?.includes('permission') || error.message?.includes('Insufficient')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message?.includes('system')) {
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const organization = await deleteOrganization(id, user.id);

    return NextResponse.json({
      message: 'Organization deleted successfully',
      organization,
    });
  } catch (error: any) {
    console.error('Error deleting organization:', error);
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (error.message?.includes('permission') || error.message?.includes('Only owners')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message?.includes('system')) {
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
