import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import Logo from './Logo';
import UserDropdown from './UserDropdown';

export default async function Navigation() {
  const user = await getCurrentUser();

  return (
    <header className="app-topbar">
      <div className="container-fluid">
        <div className="navbar-header">
          <div className="d-flex align-items-center gap-2" style={{ flex: '0 0 auto' }}>
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

          <div className="d-flex align-items-center gap-2" style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
            {user ? (
          <>
                <div className="topbar-item">
            <Link
                    href="/"
                    className="topbar-button btn btn-link text-decoration-none d-flex align-items-center"
              style={{
                color: 'var(--bs-topbar-item-color, var(--color-text))',
              }}
                    title="Home"
            >
                    <i className="bx bx-home fs-22 align-middle"></i>
            </Link>
                </div>
                <div className="topbar-item">
            <Link
                    href="/dashboard"
                    className="topbar-button btn btn-link text-decoration-none d-flex align-items-center"
              style={{
                color: 'var(--bs-topbar-item-color, var(--color-text))',
              }}
                    title="Dashboard"
            >
                    <i className="bx bx-bar-chart fs-22 align-middle"></i>
            </Link>
                </div>
                <UserDropdown user={user} />
          </>
        ) : (
          <>
                <div className="topbar-item">
            <Link
              href="/login"
                    className="topbar-button btn btn-link text-decoration-none"
              style={{
                color: 'var(--bs-topbar-item-color, var(--color-text))',
              }}
            >
              Login
            </Link>
                </div>
                <div className="topbar-item">
            <Link
              href="/register"
              className="btn btn-primary"
            >
              Sign Up
            </Link>
                </div>
          </>
        )}
      </div>
        </div>
      </div>
    </header>
  );
}
