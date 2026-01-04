import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import LogoutButton from './LogoutButton';

export default async function Navigation() {
  const user = await getCurrentUser();

  return (
    <nav
      style={{
        backgroundColor: 'var(--color-nav-bg)',
        borderBottom: '1px solid var(--color-nav-border)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link
          href="/"
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'var(--color-link)',
            textDecoration: 'none',
          }}
        >
          InterlinedList
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {user ? (
          <>
            <Link
              href="/dashboard"
              style={{
                color: 'var(--color-text)',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '5px',
              }}
              className="nav-link"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              style={{
                color: 'var(--color-text)',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '5px',
              }}
              className="nav-link"
            >
              Settings
            </Link>
            <span
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.9rem',
                padding: '0.5rem 1rem',
              }}
            >
              {user.displayName || user.username}
            </span>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link
              href="/login"
              style={{
                color: 'var(--color-text)',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '5px',
              }}
              className="nav-link"
            >
              Login
            </Link>
            <Link
              href="/register"
              style={{
                backgroundColor: 'var(--color-button-primary)',
                color: 'var(--color-button-text)',
                textDecoration: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '5px',
              }}
              className="nav-link-primary"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
