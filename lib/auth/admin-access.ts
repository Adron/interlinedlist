import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInOrganization } from '@/lib/organizations/queries';
import { prisma } from '@/lib/prisma';

type AuthUser = Awaited<ReturnType<typeof getCurrentUser>>;

/**
 * Check if user has admin access AND is owner of "The Public" organization.
 * Returns the user if authorized, null otherwise. Use for API routes.
 */
export async function checkAdminAndPublicOwner(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user || !user.isAdministrator) return null;

  try {
    const publicOrg = await prisma.organization.findFirst({
      where: { name: 'The Public', deletedAt: null },
    });
    if (!publicOrg) return null;
    const userRole = await getUserRoleInOrganization(publicOrg.id, user.id);
    return userRole === 'owner' ? user : null;
  } catch {
    return null;
  }
}

/**
 * Require administrator access AND ownership of "The Public" organization.
 * Returns the user if authorized; redirects to /login or /dashboard otherwise.
 */
export async function requireAdminAndPublicOwner() {
  const user = await checkAdminAndPublicOwner();
  if (user) return user;
  const currentUser = await getCurrentUser();
  redirect(currentUser ? '/dashboard' : '/login');
}
