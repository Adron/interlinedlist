import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function ExportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Get counts for user's data
  const [messagesCount, listsCount, listDataRowsCount, followsCount] = await Promise.all([
    prisma.message.count({ where: { userId: user.id } }),
    prisma.list.count({ where: { userId: user.id, deletedAt: null } }),
    prisma.listDataRow.count({
      where: {
        list: {
          userId: user.id,
          deletedAt: null,
        },
        deletedAt: null,
      },
    }),
    prisma.follow.count({
      where: {
        OR: [
          { followerId: user.id },
          { followingId: user.id },
        ],
      },
    }),
  ]);

  const exportDataTypes = [
    {
      name: 'Messages',
      description: 'All messages you have posted',
      count: messagesCount,
      exportUrl: '/api/exports/messages',
      icon: 'bx-message',
    },
    {
      name: 'Lists',
      description: 'All lists you have created',
      count: listsCount,
      exportUrl: '/api/exports/lists',
      icon: 'bx-list-ul',
    },
    {
      name: 'List Data Rows',
      description: 'All data rows from your lists',
      count: listDataRowsCount,
      exportUrl: '/api/exports/list-data-rows',
      icon: 'bx-table',
    },
    {
      name: 'Follows',
      description: 'Your followers and following relationships',
      count: followsCount,
      exportUrl: '/api/exports/follows',
      icon: 'bx-user-plus',
    },
  ];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center gap-3 mb-3">
            <Link href="/dashboard" className="btn btn-outline-secondary btn-sm">
              <i className="bx bx-arrow-back me-1"></i>
              Back to Dashboard
            </Link>
            <h1 className="h3 mb-0">Data Exports</h1>
          </div>
          <p className="text-muted">
            Export your data from the platform. Select a data type below to download your information.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {exportDataTypes.map((dataType) => (
          <div key={dataType.name} className="col-md-6 col-lg-4">
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <div className="d-flex align-items-start mb-3">
                  <div className="flex-shrink-0">
                    <div className="bg-primary bg-opacity-10 rounded p-3">
                      <i className={`bx ${dataType.icon} fs-4 text-primary`}></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="card-title mb-1">{dataType.name}</h5>
                    <p className="card-text text-muted small mb-0">{dataType.description}</p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">
                      <strong>{dataType.count.toLocaleString()}</strong> records
                    </span>
                  </div>
                  <a
                    href={dataType.exportUrl}
                    className="btn btn-primary w-100"
                    download
                  >
                    <i className="bx bx-download me-1"></i>
                    Export {dataType.name}
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
