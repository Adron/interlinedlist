/**
 * Organization utility functions
 * Helper functions for slug generation, validation, and permission checking
 */

import { Organization, OrganizationRole } from '@/lib/types';

/**
 * Convert organization name to URL-friendly slug
 * @param name Organization name
 * @returns URL-friendly slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validate slug format
 * @param slug Slug to validate
 * @returns true if valid, false otherwise
 */
export function validateSlug(slug: string): boolean {
  // Slug should be lowercase, alphanumeric with hyphens, 1-50 characters
  const slugRegex = /^[a-z0-9-]{1,50}$/;
  return slugRegex.test(slug);
}

/**
 * Get numeric hierarchy value for role comparison
 * Higher number = higher permission level
 * @param role Organization role
 * @returns Numeric hierarchy value
 */
export function getRoleHierarchy(role: OrganizationRole): number {
  const hierarchy: Record<OrganizationRole, number> = {
    owner: 3,
    admin: 2,
    member: 1,
  };
  return hierarchy[role];
}

/**
 * Check if user has required permission level
 * @param userRole User's role in organization
 * @param requiredRole Required role level
 * @returns true if user has sufficient permission
 */
export function hasPermission(userRole: OrganizationRole, requiredRole: OrganizationRole): boolean {
  return getRoleHierarchy(userRole) >= getRoleHierarchy(requiredRole);
}

/**
 * Check if user can modify organization
 * Requires owner or admin role
 * @param userRole User's role in organization
 * @returns true if user can modify
 */
export function canUserModifyOrganization(userRole: OrganizationRole | null): boolean {
  if (!userRole) return false;
  return hasPermission(userRole, 'admin');
}

/**
 * Check if user can delete organization
 * Requires owner role and organization must not be system org
 * @param userRole User's role in organization
 * @param isSystem Whether organization is a system organization
 * @returns true if user can delete
 */
export function canUserDeleteOrganization(userRole: OrganizationRole | null, isSystem: boolean): boolean {
  if (!userRole || isSystem) return false;
  return hasPermission(userRole, 'owner');
}

/**
 * Generate unique slug by appending number if slug already exists
 * @param baseSlug Base slug to make unique
 * @param existingSlugs Array of existing slugs
 * @returns Unique slug
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}
