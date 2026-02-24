import { prisma } from '@/lib/prisma';
import UserManagement from '@/components/admin/UserManagement';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
<<<<<<< HEAD
<<<<<<< HEAD
import { requireAdminAndPublicOwner } from '@/lib/auth/admin-access';
=======
>>>>>>> 02fe833 (All these things are supposedly going to fix the amil send!)
=======
import { requireAdminAndPublicOwner } from '@/lib/auth/admin-access';
>>>>>>> 6dad121 (admin and related changes.)

export default async function AdminPage() {
  const user = await requireAdminAndPublicOwner();

  // Fetch users for display
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatar: true,
      bio: true,
      emailVerified: true,
      cleared: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  // Check which users are administrators
  const adminUserIds = new Set(
    (
      await prisma.administrator.findMany({
        select: { userId: true },
      })
    ).map((a) => a.userId)
  );

  // Add administrator flag to users
  const usersWithAdminFlag = users.map((u) => ({
    ...u,
    isAdministrator: adminUserIds.has(u.id),
    createdAt: u.createdAt.toISOString(),
  }));

  // Get total count
  const total = await prisma.user.count();

  const breadcrumbItems = [{ label: 'Administration' }];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <ListBreadcrumbs items={breadcrumbItems} />
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-end gap-2">
<<<<<<< HEAD
          <a href="/admin/email-logging" className="btn btn-outline-primary">
<<<<<<< HEAD
          <a href="/admin/support-links" className="btn btn-outline-primary">
=======
=======
>>>>>>> 6dad121 (admin and related changes.)
          <a href="/admin/support-links" className="btn btn-outline-secondary">
>>>>>>> 80ecdd7 (New file and page. Probably needs redone.)
            <i className="bx bx-link me-2"></i>Support Links
          </a>
          <a href="/admin/email-logging" className="btn btn-outline-primary">
            <i className="bx bx-envelope me-2"></i>Email Logging
          </a>
          <a href="/admin/users/new" className="btn btn-primary">
            <i className="bx bx-plus me-2"></i>Add User
          </a>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <UserManagement
            initialUsers={usersWithAdminFlag}
            initialTotal={total}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  );
}
