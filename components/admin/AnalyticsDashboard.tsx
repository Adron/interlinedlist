import Link from 'next/link';

interface AnalyticsDashboardProps {
  range: number;
  totalPageViews: number;
  uniqueSessions: number;
  totalActions: number;
  pageViewsByDay: { date: string; count: number }[];
  topPages: { path: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  funnelCounts: Record<string, number>;
  signUpFunnel: {
    registerViews: number;
    signUps: number;
    emailVerified: number;
    cleared: number;
  } | null;
  helpDocsBySlug: { slug: string; count: number }[];
  oauthByProvider: { provider: string; count: number }[];
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
  totalPageViews,
  uniqueSessions,
  totalActions,
  pageViewsByDay,
  topPages,
  topReferrers,
  funnelCounts,
  signUpFunnel,
  helpDocsBySlug,
  oauthByProvider,
}: AnalyticsDashboardProps) {
  const maxPageViews = Math.max(1, ...pageViewsByDay.map((d) => d.count));

  return (
    <>
      <div className="row mb-4">
        <div className="col-12">
          <div className="row g-3">
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Page views</p>
                  <p className="h4 mb-0">{totalPageViews.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Unique sessions</p>
                  <p className="h4 mb-0">{uniqueSessions.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Actions</p>
                  <p className="h4 mb-0">{totalActions.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Sign ups</p>
                  <p className="h4 mb-0">{(funnelCounts.sign_up ?? 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-3">
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

      {signUpFunnel && (signUpFunnel.registerViews > 0 || signUpFunnel.signUps > 0) && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Sign-up funnel</h5>
              </div>
              <div className="card-body">
                <p className="text-muted small mb-3">
                  Register page views → Sign ups → Email verified → Cleared for posting
                </p>
                <div className="d-flex align-items-end gap-2 flex-wrap" style={{ minHeight: 80 }}>
                  <div className="text-center">
                    <div
                      className="bg-primary bg-opacity-75 rounded px-2 py-1 text-white small"
                      style={{ minWidth: 70 }}
                    >
                      {signUpFunnel.registerViews}
                    </div>
                    <p className="small text-muted mb-0 mt-1">Register views</p>
                  </div>
                  <span className="small text-muted">→</span>
                  <div className="text-center">
                    <div
                      className="bg-primary bg-opacity-75 rounded px-2 py-1 text-white small"
                      style={{ minWidth: 70 }}
                    >
                      {signUpFunnel.signUps}
                    </div>
                    <p className="small text-muted mb-0 mt-1">Sign ups</p>
                  </div>
                  <span className="small text-muted">→</span>
                  <div className="text-center">
                    <div
                      className="bg-primary bg-opacity-75 rounded px-2 py-1 text-white small"
                      style={{ minWidth: 70 }}
                    >
                      {signUpFunnel.emailVerified}
                    </div>
                    <p className="small text-muted mb-0 mt-1">Email verified</p>
                  </div>
                  <span className="small text-muted">→</span>
                  <div className="text-center">
                    <div
                      className="bg-success bg-opacity-75 rounded px-2 py-1 text-white small"
                      style={{ minWidth: 70 }}
                    >
                      {signUpFunnel.cleared}
                    </div>
                    <p className="small text-muted mb-0 mt-1">Cleared</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Help docs (most viewed)</h5>
            </div>
            <div className="card-body p-0">
              {helpDocsBySlug.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Slug</th>
                        <th className="text-end">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {helpDocsBySlug.map((h) => (
                        <tr key={h.slug}>
                          <td>
                            <a href={`/help/${h.slug}`} className="text-decoration-none">
                              {h.slug}
                            </a>
                          </td>
                          <td className="text-end">{h.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small p-3 mb-0">No help doc views in this period.</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">OAuth connections by provider</h5>
            </div>
            <div className="card-body p-0">
              {oauthByProvider.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th className="text-end">Connections</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oauthByProvider.map((o) => (
                        <tr key={o.provider}>
                          <td className="text-capitalize">{o.provider}</td>
                          <td className="text-end">{o.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small p-3 mb-0">No OAuth connections in this period.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
