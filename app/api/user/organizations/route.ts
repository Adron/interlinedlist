import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getUserOrganizations,
  addUserToOrganization,
  getOrganizationById,
} from '@/lib/organizations/queries';
import { OrganizationRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') as OrganizationRole | null;

    const organizations = await getUserOrganizations(user.id, {
      role: role || undefined,
    });

    return NextResponse.json({
      organizations,
    });
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Check if organization exists and is public
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!organization.isPublic) {
      return NextResponse.json(
        { error: 'Cannot join private organization. An invitation is required.' },
        { status: 403 }
      );
    }

    // Add user to organization (they can join public orgs themselves)
    const membership = await addUserToOrganization(
      organizationId,
      user.id,
      'member',
      user.id // User is adding themselves
    );

    return NextResponse.json(
      {
        message: 'Joined organization successfully',
        membership,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error joining organization:', error);
    
    if (error.message?.includes('already a member')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error.message?.includes('not found')) {
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

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
