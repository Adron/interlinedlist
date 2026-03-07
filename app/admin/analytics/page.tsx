import { prisma } from '@/lib/prisma';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
import { requireAdminAndPublicOwner } from '@/lib/auth/admin-access';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';

interface AnalyticsPageProps {
  searchParams: Promise<{ range?: string }> | { range?: string };
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await requireAdminAndPublicOwner();

  const resolved = await Promise.resolve(searchParams);
  const range = resolved.range === '90' ? 90 : resolved.range === '30' ? 30 : 7;
  const since = new Date();
  since.setDate(since.getDate() - range);

  const [
    pageViewsOverTime,
    topPages,
    topReferrers,
    funnelCounts,
    uniqueSessions,
    totalActions,
    signUpFunnel,
    helpDocsBySlug,
    oauthByProvider,
  ] = await Promise.all([
    prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT DATE_TRUNC('day', "createdAt")::date AS date, COUNT(*)::bigint AS count
      FROM analytics_events
      WHERE type = 'page_view' AND "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `,
    prisma.analyticsEvent.groupBy({
      by: ['path'],
      where: { type: 'page_view', createdAt: { gte: since }, path: { not: null } },
      _count: { id: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['referrer'],
      where: {
        type: 'page_view',
        createdAt: { gte: since },
        referrer: { not: null, notIn: [''] },
      },
      _count: { id: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['name'],
      where: { type: 'action', createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['sessionId'],
      where: { type: 'page_view', createdAt: { gte: since }, sessionId: { not: null } },
      _count: { id: true },
    }),
    prisma.analyticsEvent.count({ where: { type: 'action', createdAt: { gte: since } } }),
    prisma.$queryRaw<
      { register_views: bigint; sign_ups: bigint; email_verified: bigint; cleared: bigint }[]
    >`
      SELECT
        (SELECT COUNT(*)::bigint FROM analytics_events WHERE type = 'page_view' AND path LIKE '/register%' AND "createdAt" >= ${since}) AS "register_views",
        (SELECT COUNT(*)::bigint FROM analytics_events WHERE type = 'action' AND name = 'sign_up' AND "createdAt" >= ${since}) AS "sign_ups",
        (SELECT COUNT(*)::bigint FROM analytics_events WHERE type = 'action' AND name = 'email_verified' AND "createdAt" >= ${since}) AS "email_verified",
        (SELECT COUNT(*)::bigint FROM analytics_events WHERE type = 'action' AND name = 'cleared' AND "createdAt" >= ${since}) AS "cleared"
    `,
    prisma.$queryRaw<{ slug: string | null; count: bigint }[]>`
      SELECT properties->>'slug' AS slug, COUNT(*)::bigint AS count
      FROM analytics_events
      WHERE type = 'action' AND name = 'help_view' AND "createdAt" >= ${since} AND properties IS NOT NULL
      GROUP BY properties->>'slug'
      ORDER BY count DESC
      LIMIT 15
    `,
    prisma.$queryRaw<{ provider: string | null; count: bigint }[]>`
      SELECT properties->>'provider' AS provider, COUNT(*)::bigint AS count
      FROM analytics_events
      WHERE type = 'action' AND name = 'oauth_connect' AND "createdAt" >= ${since} AND properties IS NOT NULL
      GROUP BY properties->>'provider'
      ORDER BY count DESC
    `,
  ]);

  const pageViewsByDay = pageViewsOverTime.map((r) => ({
    date: (r.date as Date).toISOString().slice(0, 10),
    count: Number(r.count),
  }));

  const funnelMap = Object.fromEntries(
    funnelCounts.map((f) => [f.name, f._count.id])
  );

  const totalPageViews = pageViewsByDay.reduce((s, d) => s + d.count, 0);
  const uniqueSessionCount = uniqueSessions.length;
  const signUpFunnelRow = signUpFunnel[0];
  const helpDocs = helpDocsBySlug
    .filter((r) => r.slug)
    .map((r) => ({ slug: r.slug!, count: Number(r.count) }));
  const oauthProviders = oauthByProvider
    .filter((r) => r.provider)
    .map((r) => ({ provider: r.provider!, count: Number(r.count) }));

  topPages.sort((a, b) => b._count.id - a._count.id);
  topReferrers.sort((a, b) => b._count.id - a._count.id);

  const breadcrumbItems = [
    { label: 'Administration', href: '/admin' },
    { label: 'Analytics' },
  ];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <ListBreadcrumbs items={breadcrumbItems} />
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h4 mb-0">Analytics</h1>
          <p className="text-muted small mb-0">
            Traffic and funnel metrics. Data is stored in PostgreSQL.
          </p>
        </div>
      </div>

      <AnalyticsDashboard
        range={range}
        totalPageViews={totalPageViews}
        uniqueSessions={uniqueSessionCount}
        totalActions={totalActions}
        pageViewsByDay={pageViewsByDay}
        topPages={topPages.map((p) => ({ path: p.path ?? '(unknown)', count: p._count.id }))}
        topReferrers={topReferrers.map((r) => ({
          referrer: r.referrer ?? '(unknown)',
          count: r._count.id,
        }))}
        funnelCounts={funnelMap}
        signUpFunnel={
          signUpFunnelRow
            ? {
                registerViews: Number(signUpFunnelRow.register_views),
                signUps: Number(signUpFunnelRow.sign_ups),
                emailVerified: Number(signUpFunnelRow.email_verified),
                cleared: Number(signUpFunnelRow.cleared),
              }
            : null
        }
        helpDocsBySlug={helpDocs}
        oauthByProvider={oauthProviders}
      />
    </div>
  );
}
