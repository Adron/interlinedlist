import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';

const SUPPORT_LINKS = [
  { title: 'Vercel Project Overview', url: 'https://vercel.com/ctt-a-team/interlinedlist' },
  { title: 'Vercel Deployments', url: 'https://vercel.com/ctt-a-team/interlinedlist/deployments' },
  { title: 'Vercel Logs', url: 'https://vercel.com/ctt-a-team/interlinedlist/logs' },
  { title: 'Vercel Observability', url: 'https://vercel.com/ctt-a-team/interlinedlist/observability' },
  { title: 'Vercel Storage', url: 'https://vercel.com/ctt-a-team/interlinedlist/stores' },
  { title: 'Vercel Project Settings', url: 'https://vercel.com/ctt-a-team/interlinedlist/settings' },
  { title: 'Vercel Environment Variables', url: 'https://vercel.com/ctt-a-team/interlinedlist/settings/environment-variables' },
  { title: 'Resend Emails', url: 'https://resend.com/emails' },
  { title: 'Resend Domains', url: 'https://resend.com/domains' },
  { title: 'Resend API Keys', url: 'https://resend.com/api-keys' },
];

export default async function SupportLinksPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!user.isAdministrator) {
    redirect('/dashboard');
  }

  const breadcrumbItems = [
    { label: 'Administration', href: '/admin' },
    { label: 'Support Links' },
  ];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <ListBreadcrumbs items={breadcrumbItems} />
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h4 mb-0">Support Links</h1>
          <p className="text-muted small mb-0">
            Quick links to Vercel deployment, Resend email, and related external services.
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover table-sm">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SUPPORT_LINKS.map((item) => (
                      <tr key={item.url}>
                        <td>{item.title}</td>
                        <td>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-decoration-none"
                          >
                            {item.url}
                            <i className="bx bx-link-external ms-1 small" aria-hidden="true" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
