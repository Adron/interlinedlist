/**
 * Organization Queries
 * 
 * Query utilities for organizations with pagination, filtering, and permission checks
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { OrganizationRole } from '@/lib/types';
import { generateSlug, generateUniqueSlug, hasPermission } from './utils';

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

const PUBLIC_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Get a single organization by ID
 */
export async function getOrganizationById(organizationId: string) {
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      deletedAt: null,
    },
  });
  if (!organization) return null;
  return {
    ...organization,
    settings: organization.settings as Record<string, any> | null,
  };
}

/**
 * Get organization by URL-friendly slug
 */
export async function getOrganizationBySlug(slug: string) {
  const organization = await prisma.organization.findFirst({
    where: {
      slug,
      deletedAt: null,
    },
  });
  if (!organization) return null;
  return {
    ...organization,
    settings: organization.settings as Record<string, any> | null,
  };
}

/**
 * Get all public organizations (not deleted)
 */
export async function getPublicOrganizations(options: PaginationParams = {}) {
  const { limit = 20, offset = 0 } = options;

  const where: Prisma.OrganizationWhereInput = {
    isPublic: true,
    deletedAt: null,
  };

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    organizations: organizations.map(org => ({
      ...org,
      settings: org.settings as Record<string, any> | null,
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(
  userId: string,
  options: { includeDeleted?: boolean; role?: OrganizationRole } = {}
) {
  const { includeDeleted = false, role } = options;

  const where: Prisma.UserOrganizationWhereInput = {
    userId,
    ...(role ? { role } : {}),
    ...(includeDeleted ? {} : { organization: { deletedAt: null } }),
  };

  const memberships = await prisma.userOrganization.findMany({
    where,
    include: {
      organization: true,
    },
    orderBy: {
      joinedAt: 'desc',
    },
  });

  return memberships.map((m) => ({
    ...m.organization,
    settings: m.organization.settings as Record<string, any> | null,
    role: m.role as OrganizationRole,
    joinedAt: m.joinedAt,
  }));
}

/**
 * Get all members of an organization
 */
export async function getOrganizationMembers(
  organizationId: string,
  options: PaginationParams & { role?: OrganizationRole } = {}
) {
  const { limit = 50, offset = 0, role } = options;

  const where: Prisma.UserOrganizationWhereInput = {
    organizationId,
    ...(role ? { role } : {}),
  };

  const [memberships, total] = await Promise.all([
    prisma.userOrganization.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            emailVerified: true,
          },
        },
      },
      orderBy: [
        { role: 'desc' }, // owners first, then admins, then members
        { joinedAt: 'asc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.userOrganization.count({ where }),
  ]);

  return {
    members: memberships.map((m) => ({
      ...m.user,
      role: m.role as OrganizationRole,
      active: m.active,
      joinedAt: m.joinedAt,
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

/**
 * Create a new organization
 */
export async function createOrganization(data: {
  name: string;
  description?: string;
  avatar?: string;
  isPublic?: boolean;
  createdBy: string;
}) {
  // Generate slug from name
  const baseSlug = generateSlug(data.name);
  
  // Check for existing slugs
  const existingOrgs = await prisma.organization.findMany({
    select: { slug: true },
  });
  const existingSlugs = existingOrgs.map((o) => o.slug);
  const slug = generateUniqueSlug(baseSlug, existingSlugs);

  // Create organization and membership in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        avatar: data.avatar,
        isPublic: data.isPublic ?? true,
        isSystem: false,
      },
    });

    // Add creator as owner
    await tx.userOrganization.create({
      data: {
        userId: data.createdBy,
        organizationId: organization.id,
        role: 'owner',
      },
    });

    return organization;
  });

  return result;
}

/**
 * Update organization (requires owner/admin role)
 */
export async function updateOrganization(
  organizationId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    avatar?: string;
    isPublic?: boolean;
    settings?: any;
  }
) {
  // Check if organization exists and user has permission
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    include: {
      organization: true,
    },
  });

  if (!membership || !membership.organization) {
    throw new Error('Organization not found');
  }

  if (membership.organization.isSystem) {
    throw new Error('Cannot update system organizations');
  }

  if (!hasPermission(membership.role as OrganizationRole, 'admin')) {
    throw new Error('Insufficient permissions');
  }

  // If name is being updated, regenerate slug
  let updateData: Prisma.OrganizationUpdateInput = {
    description: data.description,
    avatar: data.avatar,
    isPublic: data.isPublic,
    settings: data.settings,
  };

  if (data.name && data.name !== membership.organization.name) {
    const baseSlug = generateSlug(data.name);
    const existingOrgs = await prisma.organization.findMany({
      where: {
        id: { not: organizationId },
      },
      select: { slug: true },
    });
    const existingSlugs = existingOrgs.map((o) => o.slug);
    updateData.name = data.name;
    updateData.slug = generateUniqueSlug(baseSlug, existingSlugs);
  }

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: updateData,
  });

  return organization;
}

/**
 * Delete organization (soft delete, requires owner role)
 */
export async function deleteOrganization(organizationId: string, userId: string) {
  // Check if organization exists and user has permission
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    include: {
      organization: true,
    },
  });

  if (!membership || !membership.organization) {
    throw new Error('Organization not found');
  }

  if (membership.organization.isSystem) {
    throw new Error('Cannot delete system organizations');
  }

  if (membership.role !== 'owner') {
    throw new Error('Only owners can delete organizations');
  }

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      deletedAt: new Date(),
    },
  });

  return organization;
}

/**
 * Add user to organization
 */
export async function addUserToOrganization(
  organizationId: string,
  userId: string,
  role: OrganizationRole = 'member',
  addedBy?: string
) {
  // Check if organization exists
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      deletedAt: null,
    },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  // If private organization, require admin/owner to add
  if (!organization.isPublic && addedBy) {
    const adderMembership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: addedBy,
          organizationId,
        },
      },
    });

    if (!adderMembership || !hasPermission(adderMembership.role as OrganizationRole, 'admin')) {
      throw new Error('Insufficient permissions to add members to private organization');
    }
  }

  // Check if user is already a member
  const existing = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (existing) {
    throw new Error('User is already a member of this organization');
  }

  const membership = await prisma.userOrganization.create({
    data: {
      userId,
      organizationId,
      role,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
      organization: true,
    },
  });

  return membership;
}

/**
 * Remove user from organization
 */
export async function removeUserFromOrganization(
  organizationId: string,
  userId: string,
  removedBy: string
) {
  // Check if user is a member
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    throw new Error('User is not a member of this organization');
  }

  // Users cannot leave or be removed from system organizations (e.g. "The Public")
  if (membership.organization.isSystem) {
    throw new Error('Cannot leave or be removed from this organization');
  }

  // Check permissions: user can remove themselves, or admin/owner can remove others
  if (userId !== removedBy) {
    const removerMembership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: removedBy,
          organizationId,
        },
      },
    });

    if (!removerMembership || !hasPermission(removerMembership.role as OrganizationRole, 'admin')) {
      throw new Error('Insufficient permissions');
    }
  }

  // Check if removing last owner
  if (membership.role === 'owner') {
    const ownerCount = await prisma.userOrganization.count({
      where: {
        organizationId,
        role: 'owner',
      },
    });

    if (ownerCount === 1) {
      throw new Error('Cannot remove the last owner');
    }
  }

  await prisma.userOrganization.delete({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  return membership;
}

/**
 * Update user's role in organization
 */
export async function updateUserRole(
  organizationId: string,
  userId: string,
  newRole: OrganizationRole,
  updatedBy: string,
  active?: boolean
) {
  // Check if user is a member
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!membership) {
    throw new Error('User is not a member of this organization');
  }

  // Check permissions: owner can update any role, admin can update member/admin roles
  const updaterMembership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: updatedBy,
        organizationId,
      },
    },
  });

  if (!updaterMembership) {
    throw new Error('Updater is not a member of this organization');
  }

  const updaterRole = updaterMembership.role as OrganizationRole;
  const currentRole = membership.role as OrganizationRole;

  // Owner can update any role
  if (updaterRole !== 'owner') {
    // Admin can only update member/admin roles (not owner)
    if (updaterRole === 'admin' && (currentRole === 'owner' || newRole === 'owner')) {
      throw new Error('Insufficient permissions to change owner role');
    }
    // Admin can only promote to admin, not owner
    if (updaterRole === 'admin' && newRole === 'owner') {
      throw new Error('Insufficient permissions to assign owner role');
    }
  }

  // Check if demoting last owner
  if (currentRole === 'owner' && newRole !== 'owner') {
    const ownerCount = await prisma.userOrganization.count({
      where: {
        organizationId,
        role: 'owner',
      },
    });

    if (ownerCount === 1) {
      throw new Error('Cannot demote the last owner');
    }
  }

  const updateData: Prisma.UserOrganizationUpdateInput = {
    role: newRole,
  };

  // Update active status if provided
  if (active !== undefined) {
    updateData.active = active;
  }

  const updated = await prisma.userOrganization.update({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    data: updateData,
  });

  return updated;
}

/**
 * Get "The Public" system organization
 */
export async function getPublicOrganization() {
  const organization = await prisma.organization.findFirst({
    where: {
      isSystem: true,
      name: 'The Public',
      deletedAt: null,
    },
  });
  return organization;
}

/**
 * Ensure user is a member of "The Public" organization
 */
export async function ensureUserInPublicOrganization(userId: string) {
  let publicOrg = await getPublicOrganization();

  if (!publicOrg) {
    // Create "The Public" organization if it doesn't exist
    publicOrg = await prisma.organization.create({
      data: {
        id: PUBLIC_ORG_ID,
        name: 'The Public',
        slug: 'the-public',
        description: 'The default public organization that all users belong to.',
        isPublic: true,
        isSystem: true,
      },
    });
  }

  // Check if user is already a member
  const existing = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: publicOrg.id,
      },
    },
  });

  if (!existing) {
    await prisma.userOrganization.create({
      data: {
        userId,
        organizationId: publicOrg.id,
        role: 'member',
      },
    });
  }

  return publicOrg;
}

/**
 * Check if user has required permission level in organization
 */
export async function checkUserPermission(
  organizationId: string,
  userId: string,
  requiredRole: OrganizationRole
): Promise<boolean> {
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!membership) {
    return false;
  }

  return hasPermission(membership.role as OrganizationRole, requiredRole);
}

/**
 * Get user's role in organization
 */
export async function getUserRoleInOrganization(
  organizationId: string,
  userId: string
): Promise<OrganizationRole | null> {
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  return membership ? (membership.role as OrganizationRole) : null;
}
