import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import Link from 'next/link';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex align-items-center gap-3 mb-4">
            <Link href="/dashboard" className="btn btn-outline-secondary btn-sm">
              <i className="bx bx-arrow-back me-1"></i>
              Back to Dashboard
            </Link>
            <h1 className="h3 mb-0">Settings</h1>
          </div>
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="bx bx-cog fs-1 text-muted mb-3 d-block"></i>
              <h2 className="h4 mb-3">Coming soon!</h2>
              <p className="text-muted">Settings functionality will be available soon.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

