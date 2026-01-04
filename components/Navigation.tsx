import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import LogoutButton from './LogoutButton';
import Logo from './Logo';

export default async function Navigation() {
  const user = await getCurrentUser();

  return (
    <header className="app-topbar">
      <div className="container-fluid">
        <div className="navbar-header">
          <div className="d-flex align-items-center gap-2">
        <Link
          href="/"
          style={{
            textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
          }}
        >
              <Logo size="medium" showText={true} />
        </Link>
      </div>

          <div className="d-flex align-items-center gap-2">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className="btn btn-link text-decoration-none"
              style={{
                color: 'var(--bs-topbar-item-color, var(--color-text))',
              }}
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="btn btn-link text-decoration-none"
              style={{
                color: 'var(--bs-topbar-item-color, var(--color-text))',
              }}
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
              className="btn btn-link text-decoration-none"
              style={{
                color: 'var(--bs-topbar-item-color, var(--color-text))',
              }}
            >
              Login
            </Link>
            <Link
              href="/register"
              className="btn btn-primary"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
        </div>
      </div>
    </header>
  );
}
