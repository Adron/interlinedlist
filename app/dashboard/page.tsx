import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { Avatar } from '@/components/Avatar';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--color-text)' }}>Dashboard</h1>

      <EmailVerificationBanner emailVerified={user.emailVerified} />

      <div style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
          {user.avatar && (
            <Avatar
              src={user.avatar}
              alt={`${user.displayName || user.username}'s avatar`}
              size={80}
            />
          )}
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Welcome, {user.displayName || user.username}!</h2>
            <p style={{ margin: '5px 0 0 0', color: 'var(--color-text-secondary)' }}>Email: {user.email}</p>
            <p style={{ margin: '5px 0 0 0', color: 'var(--color-text-secondary)' }}>Username: {user.username}</p>
          </div>
        </div>
        {user.bio && <p style={{ marginTop: '15px', color: 'var(--color-text)' }}>Bio: {user.bio}</p>}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3 style={{ color: 'var(--color-text)' }}>Your Profile</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '10px', color: 'var(--color-text)' }}>
            <strong>Display Name:</strong> {user.displayName || 'Not set'}
          </li>
          <li style={{ marginBottom: '10px', color: 'var(--color-text)' }}>
            <strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}
          </li>
          <li style={{ marginBottom: '10px', color: 'var(--color-text)' }}>
            <strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}
          </li>
        </ul>
      </div>
    </div>
  );
}

