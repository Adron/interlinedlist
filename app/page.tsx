import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div>
      {user ? (
        // Authenticated user view
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
          <div
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              padding: '3rem',
              borderRadius: '12px',
              marginBottom: '3rem',
              textAlign: 'center',
            }}
          >
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
              Welcome back, {user.displayName || user.username}!
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
              Continue your micro-blogging journey on InterlinedList
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link
                href="/dashboard"
                className="btn btn-primary"
                style={{
                  display: 'inline-block',
                  padding: '1rem 2rem',
                  backgroundColor: 'var(--color-button-primary)',
                  color: 'var(--color-button-text)',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                }}
              >
                Go to Dashboard
              </Link>
              <Link
                href="/settings"
                className="btn btn-secondary"
                style={{
                  display: 'inline-block',
                  padding: '1rem 2rem',
                  backgroundColor: 'var(--color-button-secondary)',
                  color: 'var(--color-button-text)',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                }}
              >
                Settings
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <h2 style={{ marginTop: 0, color: 'var(--color-text)' }}>Your Profile</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>Email: {user.email}</p>
              <p style={{ color: 'var(--color-text-secondary)' }}>Username: {user.username}</p>
              {user.bio && <p style={{ color: 'var(--color-text-secondary)' }}>Bio: {user.bio}</p>}
            </div>
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <h2 style={{ marginTop: 0, color: 'var(--color-text)' }}>Quick Actions</h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Manage your account and explore the platform
              </p>
              <Link
                href="/settings"
                style={{
                  color: 'var(--color-link)',
                  textDecoration: 'none',
                  fontWeight: '500',
                }}
              >
                Update Profile →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        // Unauthenticated user view - Landing page
        <div>
          {/* Hero Section */}
          <section
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '6rem 2rem',
              textAlign: 'center',
            }}
          >
            <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
              InterlinedList
            </h1>
            <p style={{ fontSize: '1.5rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
              A time-series based micro-blogging platform with embedded DSL scripts for creating interactive lists
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/register"
                className="btn btn-hero-primary"
                style={{
                  display: 'inline-block',
                  padding: '1rem 2.5rem',
                  backgroundColor: 'white',
                  color: '#667eea',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                }}
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="btn btn-hero-secondary"
                style={{
                  display: 'inline-block',
                  padding: '1rem 2.5rem',
                  backgroundColor: 'transparent',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  border: '2px solid white',
                }}
              >
                Login
              </Link>
            </div>
          </section>

          {/* Features Section */}
          <section style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 2rem' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem', color: 'var(--color-text)' }}>
              Why InterlinedList?
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem',
              }}
            >
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div
                  style={{
                    fontSize: '3rem',
                    marginBottom: '1rem',
                  }}
                >
                  📝
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                  Micro-blogging
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                  Share your thoughts and ideas in a clean, focused micro-blogging environment
                </p>
              </div>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div
                  style={{
                    fontSize: '3rem',
                    marginBottom: '1rem',
                  }}
                >
                  📊
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                  Time-series Data
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                  Built for time-series data, perfect for tracking and visualizing trends over time
                </p>
              </div>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div
                  style={{
                    fontSize: '3rem',
                    marginBottom: '1rem',
                  }}
                >
                  🔧
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                  Interactive Lists
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                  Create interactive lists with embedded DSL scripts for dynamic content
                </p>
              </div>
            </div>
          </section>

          {/* Call to Action Section */}
          <section
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              padding: '4rem 2rem',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
              Ready to get started?
            </h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
              Join InterlinedList today and start sharing your ideas with the community
            </p>
            <Link
              href="/register"
              className="btn btn-primary"
              style={{
                display: 'inline-block',
                padding: '1rem 2.5rem',
                backgroundColor: 'var(--color-button-primary)',
                color: 'var(--color-button-text)',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: '600',
              }}
            >
              Create Your Account
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
