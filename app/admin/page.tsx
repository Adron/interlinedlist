import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import UserManagement from '@/components/admin/UserManagement';

export default async function AdminPage() {
  const user = await getCurrentUser();

  // Redirect if not logged in
  if (!user) {
    redirect('/login');
  }

  // Redirect if not administrator
  if (!user.isAdministrator) {
    redirect('/dashboard');
  }

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

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-end gap-2">
          <a href="/admin/email-logging" className="btn btn-outline-secondary">
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
