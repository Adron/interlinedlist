import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getPublicOrganizations,
  getUserOrganizations,
  createOrganization,
} from '@/lib/organizations/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const publicOnly = searchParams.get('public') === 'true';
    const userIdParam = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // If userId is provided, get user's organizations
    if (userIdParam) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Users can only view their own organizations unless they're admins
      if (userIdParam !== user.id && !user.isAdministrator) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const organizations = await getUserOrganizations(userIdParam);
      return NextResponse.json({
        organizations,
        pagination: {
          total: organizations.length,
          limit,
          offset,
          hasMore: false,
        },
      });
    }

    // If public=true, get all public organizations
    if (publicOnly) {
      const result = await getPublicOrganizations({ limit, offset });
      return NextResponse.json(result);
    }

    // Default: get public organizations + user's private organizations if authenticated
    const user = await getCurrentUser();
    if (user) {
      // Get public organizations
      const publicResult = await getPublicOrganizations({ limit: 1000, offset: 0 });
      const publicOrgs = publicResult.organizations;
      
      // Get user's organizations (includes both public and private)
      const userOrgs = await getUserOrganizations(user.id);
      
      // Create a map to avoid duplicates
      const orgsMap = new Map();
      publicOrgs.forEach((org) => {
        orgsMap.set(org.id, org);
      });
      
      // Add user's private organizations
      userOrgs.forEach((org) => {
        if (!org.isPublic) {
          orgsMap.set(org.id, org);
        } else {
          // If it's public and user is a member, update with role info
          if (orgsMap.has(org.id)) {
            orgsMap.set(org.id, { ...orgsMap.get(org.id), role: org.role });
          }
        }
      });
      
      // Convert to array and apply pagination
      const allOrgs = Array.from(orgsMap.values());
      const paginatedOrgs = allOrgs.slice(offset, offset + limit);
      
      return NextResponse.json({
        organizations: paginatedOrgs,
        pagination: {
          total: allOrgs.length,
          limit,
          offset,
          hasMore: offset + limit < allOrgs.length,
        },
      });
    }

    // Not authenticated, return public organizations
    const result = await getPublicOrganizations({ limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching organizations:', error);
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
    const { name, description, avatar, isPublic } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const organization = await createOrganization({
      name: name.trim(),
      description: description?.trim(),
      avatar: avatar?.trim(),
      isPublic: isPublic !== undefined ? isPublic : true,
      createdBy: user.id,
    });

    return NextResponse.json(
      { message: 'Organization created successfully', organization },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating organization:', error);
    
    if (error.message?.includes('already exists') || error.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'An organization with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
