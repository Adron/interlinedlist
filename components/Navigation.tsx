import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import Logo from './Logo';
import UserDropdown from './UserDropdown';

export default async function Navigation() {
  const user = await getCurrentUser();

  return (
    <header className="app-topbar">
      <div className="container-fluid">
        <div className="navbar-header" style={{ position: 'relative' }}>
          {/* Left side - Logo icon (always visible) */}
          <div className="d-flex align-items-center gap-2" style={{ flex: '0 0 auto', marginRight: 'auto' }}>
            <div className="topbar-item">
              <Link
                href="/"
                className="topbar-button btn btn-link text-decoration-none d-flex align-items-center"
                style={{
                  color: 'var(--bs-topbar-item-color, var(--color-text))',
                }}
                title="Home"
              >
                <Logo size="medium" iconOnly={true} />
              </Link>
            </div>
          </div>

          {/* Center - Title text (desktop only) */}
          <div className="d-none d-md-flex align-items-center justify-content-center" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
            <Link
              href="/"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: 'var(--color-text)',
                  whiteSpace: 'nowrap',
                }}
              >
                InterlinedList
              </span>
            </Link>
          </div>

          {/* Right side - User actions */}
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
                <div className="topbar-item">
                  <Link
                    href="/lists"
                    className="topbar-button btn btn-link text-decoration-none d-flex align-items-center"
                    style={{
                      color: 'var(--bs-topbar-item-color, var(--color-text))',
                    }}
                    title="Lists"
                  >
                    <i className="bx bx-list-ul fs-22 align-middle"></i>
                  </Link>
                </div>
                {user.isAdministrator && (
                  <div className="topbar-item">
                    <Link
                      href="/admin"
                      className="topbar-button btn btn-link text-decoration-none d-flex align-items-center"
                      style={{
                        color: 'var(--bs-topbar-item-color, var(--color-text))',
                      }}
                      title="Administration"
                    >
                      <i className="bx bx-user-check fs-22 align-middle"></i>
                    </Link>
                  </div>
                )}
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
