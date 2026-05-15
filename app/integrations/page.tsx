import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getLinkedIdentitiesForUser } from '@/lib/auth/linked-identities';
import Link from 'next/link';
import IntegrationsClient from './IntegrationsClient';

interface IntegrationsPageProps {
  searchParams:
    | Promise<{ error?: string; success?: string }>
    | { error?: string; success?: string };
}

export default async function IntegrationsPage({ searchParams }: IntegrationsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const params = (searchParams instanceof Promise ? await searchParams : searchParams) ?? {};
  const linkedIdentities = await getLinkedIdentitiesForUser(user.id);
  const serializedIdentities = linkedIdentities.map((i) => ({
    ...i,
    connectedAt: i.connectedAt.toISOString(),
    lastVerifiedAt: i.lastVerifiedAt?.toISOString() ?? null,
  }));

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center gap-3">
            <Link href="/settings" className="btn btn-outline-secondary btn-sm">
              <i className="bx bx-arrow-back me-1"></i>
              Back to Settings
            </Link>
            <h1 className="h3 mb-0">Integrations</h1>
          </div>
          <p className="text-muted mt-2 mb-0">
            Link your GitHub, Mastodon, Bluesky, and LinkedIn accounts for sign-in and verification.
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 col-12">
          <IntegrationsClient
            initialIdentities={serializedIdentities}
            initialGithubDefaultRepo={user.githubDefaultRepo ?? ''}
            initialError={params.error}
            initialSuccess={params.success}
          />
        </div>
      </div>
    </div>
  );
}
