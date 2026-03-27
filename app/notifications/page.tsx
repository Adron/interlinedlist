import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import NotificationsDataGrid from '@/components/notifications/NotificationsDataGrid';
import MarkAllReadButton from '@/components/notifications/MarkAllReadButton';

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const rows = await prisma.userNotification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      body: true,
      actionUrl: true,
      type: true,
      createdAt: true,
      readAt: true,
    },
  });

  const serialized = rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    actionUrl: r.actionUrl,
    type: r.type,
    createdAt: r.createdAt.toISOString(),
    readAt: r.readAt ? r.readAt.toISOString() : null,
  }));

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-3">
        <div className="col-12 d-flex flex-wrap align-items-center gap-2 justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <Link href="/dashboard" className="btn btn-outline-secondary btn-sm">
              <i className="bx bx-arrow-back me-1"></i>
              Back
            </Link>
            <h1 className="h3 mb-0">Notifications</h1>
          </div>
          <MarkAllReadButton />
        </div>
      </div>
      <NotificationsDataGrid notifications={serialized} />
    </div>
  );
}
