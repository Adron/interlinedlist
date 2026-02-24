import { prisma } from '@/lib/prisma';
import EmailLogTable from '@/components/admin/EmailLogTable';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
<<<<<<< HEAD
import { requireAdminAndPublicOwner } from '@/lib/auth/admin-access';
=======
>>>>>>> 02fe833 (All these things are supposedly going to fix the amil send!)

export default async function EmailLoggingPage() {
  await requireAdminAndPublicOwner();

  const initialLogs = await prisma.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  const total = await prisma.emailLog.count();

  const logsWithDates = initialLogs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));

  const breadcrumbItems = [
    { label: 'Administration', href: '/admin' },
    { label: 'Email Logging' },
  ];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <ListBreadcrumbs items={breadcrumbItems} />
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h4 mb-0">Email Logging</h1>
          <p className="text-muted small mb-0">
            Transactional emails sent for verification, password reset, and related flows.
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <EmailLogTable
            initialLogs={logsWithDates}
            initialTotal={total}
          />
        </div>
      </div>
    </div>
  );
}
