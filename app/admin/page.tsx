import { prisma } from '@/lib/prisma';
import UserManagement from '@/components/admin/UserManagement';
import { requireAdminAndPublicOwner } from '@/lib/auth/admin-access';

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
      customerStatus: true,
      stripeCustomerId: true,
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

  return (
    <>
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center gap-2">
          <h1 className="h4 mb-0">User Management</h1>
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
    </>
  );
}
