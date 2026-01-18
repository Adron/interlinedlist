import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { Avatar } from '@/components/Avatar';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import DashboardMessageFeed from '@/components/DashboardMessageFeed';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-3">
        <div className="col-12">
          <h1 className="h2 mb-0">Dashboard</h1>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-12">
          <EmailVerificationBanner emailVerified={user.emailVerified} />
        </div>
      </div>

      <div className="row">
        {/* Left Column - Messages Table */}
        <div className="col-lg-8 mb-4">
          <DashboardMessageFeed />
        </div>

        {/* Right Column - Profile Information */}
        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3 mb-3">
                {user.avatar ? (
                  <Avatar
                    src={user.avatar}
                    alt={`${user.displayName || user.username}'s avatar`}
                    size={80}
                  />
                ) : (
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: 'var(--bs-secondary)',
                      color: 'white',
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {(user.displayName || user.username)[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="h5 mb-0">Welcome, {user.displayName || user.username}!</h3>
                  <p className="text-muted small mb-0">@{user.username}</p>
                </div>
              </div>
              {user.bio && (
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {user.bio}
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h4 className="h6 mb-3">Profile Information</h4>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <strong>Display Name:</strong>
                  <br />
                  <span className="text-muted">{user.displayName || 'Not set'}</span>
                </li>
                <li className="mb-2">
                  <strong>Email:</strong>
                  <br />
                  <span className="text-muted">{user.email}</span>
                </li>
                <li className="mb-2">
                  <strong>Email Verified:</strong>
                  <br />
                  <span className={user.emailVerified ? 'text-success' : 'text-warning'}>
                    {user.emailVerified ? '✓ Yes' : '✗ No'}
                  </span>
                </li>
                <li className="mb-0">
                  <strong>Member Since:</strong>
                  <br />
                  <span className="text-muted">{new Date(user.createdAt).toLocaleDateString()}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

