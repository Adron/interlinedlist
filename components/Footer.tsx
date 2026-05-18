import Link from 'next/link';
import Logo from './Logo';
import { getCurrentUser } from '@/lib/auth/session';

export default async function Footer() {
  const user = await getCurrentUser();

  return (
    <footer
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-border)',
        padding: '2rem',
        marginTop: '4rem',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Logo size="small" iconOnly={true} />
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            © {new Date().getFullYear()} InterlinedList. All rights reserved.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
          >
            Home
          </Link>
          <Link
            href="/features"
            style={{
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
          >
            Features
          </Link>
          <Link
            href="/about"
            style={{
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
          >
            About
          </Link>
          <Link
            href="/blog"
            style={{
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
          >
            Blog
          </Link>
          <Link
            href="/pricing"
            style={{
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
          >
            Pricing
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                style={{
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                }}
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                style={{
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                }}
              >
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/register"
                style={{
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                }}
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                style={{
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                }}
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
