import Link from 'next/link';

interface AnalyticsDashboardProps {
  range: number;
  pageViewsByDay: { date: string; count: number }[];
  topPages: { path: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  funnelCounts: Record<string, number>;
}

const FUNNEL_LABELS: Record<string, string> = {
  sign_up: 'Sign ups',
  email_verified: 'Email verified',
  cleared: 'Cleared',
  message_post: 'Messages posted',
  list_create: 'Lists created',
  list_add_row: 'Rows added',
  list_view: 'List views',
  document_create: 'Documents created',
  document_sync: 'Document syncs',
  help_view: 'Help views',
  oauth_connect: 'OAuth connects',
  settings_update: 'Settings updates',
};

export default function AnalyticsDashboard({
  range,
  pageViewsByDay,
  topPages,
  topReferrers,
  funnelCounts,
}: AnalyticsDashboardProps) {
  const maxPageViews = Math.max(1, ...pageViewsByDay.map((d) => d.count));
  const totalPageViews = pageViewsByDay.reduce((s, d) => s + d.count, 0);

  return (
    <>
      <div className="row mb-4">
        <div className="col-12">
          <div className="btn-group" role="group">
            <Link
              href="/admin/analytics?range=7"
              className={`btn btn-sm ${range === 7 ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              Last 7 days
            </Link>
            <Link
              href="/admin/analytics?range=30"
              className={`btn btn-sm ${range === 30 ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              Last 30 days
            </Link>
            <Link
              href="/admin/analytics?range=90"
              className={`btn btn-sm ${range === 90 ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              Last 90 days
            </Link>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Traffic</h5>
            </div>
            <div className="card-body">
              <p className="text-muted small mb-3">
                Total page views: <strong>{totalPageViews.toLocaleString()}</strong>
              </p>
              {pageViewsByDay.length > 0 ? (
                <div className="d-flex align-items-end gap-1" style={{ height: 120 }}>
                  {pageViewsByDay.map((d) => (
                    <div
                      key={d.date}
                      className="flex-grow-1 bg-primary rounded"
                      style={{
                        height: `${Math.max(4, (d.count / maxPageViews) * 100)}%`,
                        minWidth: 4,
                      }}
                      title={`${d.date}: ${d.count}`}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted small mb-0">No page views in this period.</p>
              )}
              {pageViewsByDay.length > 0 && (
                <div className="d-flex justify-content-between mt-1 small text-muted">
                  <span>{pageViewsByDay[0]?.date}</span>
                  <span>{pageViewsByDay[pageViewsByDay.length - 1]?.date}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Top pages</h5>
            </div>
            <div className="card-body p-0">
              {topPages.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Path</th>
                        <th className="text-end">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPages.slice(0, 10).map((p) => (
                        <tr key={p.path}>
                          <td className="text-break">{p.path}</td>
                          <td className="text-end">{p.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small p-3 mb-0">No data.</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Top referrers</h5>
            </div>
            <div className="card-body p-0">
              {topReferrers.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Referrer</th>
                        <th className="text-end">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topReferrers.slice(0, 10).map((r) => (
                        <tr key={r.referrer}>
                          <td className="text-break">
                            <a
                              href={r.referrer}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-decoration-none"
                            >
                              {r.referrer.length > 50 ? `${r.referrer.slice(0, 50)}…` : r.referrer}
                            </a>
                          </td>
                          <td className="text-end">{r.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small p-3 mb-0">No data.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Funnels</h5>
            </div>
            <div className="card-body">
              <p className="text-muted small mb-3">
                Sign up: page_view /register → sign_up → email_verified → cleared. Message: page_view / or /dashboard → message_post. Lists: page_view /lists → list_create → list_add_row. Documents: page_view /documents → document_create or document_sync. Help: page_view /help → help_view.
              </p>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th className="text-end">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(funnelCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([name, count]) => (
                        <tr key={name}>
                          <td>{FUNNEL_LABELS[name] ?? name}</td>
                          <td className="text-end">{count.toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {Object.keys(funnelCounts).length === 0 && (
                <p className="text-muted small mb-0">No action events in this period.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
