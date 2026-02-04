import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import Logo from './Logo';
import AppSidebarUserMenu from './AppSidebarUserMenu';

export default async function AppSidebar() {
  const user = await getCurrentUser();

  return (
    <div className="app-sidebar">
      {/* Sidebar Logo */}
      <div className="logo-box">
        <Link href="/" className="logo-dark d-block">
          <Logo size="medium" iconOnly={true} />
        </Link>
      </div>

      <div className="scrollbar" data-simplebar>
        <ul className="navbar-nav" id="navbar-nav">
          {/* Menu Title */}
          <li className="menu-title">Menu...</li>

          {/* Home */}
          <li className="nav-item">
            <Link className="nav-link" href="/">
              <span className="nav-icon">
                <i className="bx bx-home"></i>
              </span>
              <span className="nav-text">Home</span>
            </Link>
          </li>

          {/* Dashboard */}
          {user && (
            <li className="nav-item">
              <Link className="nav-link" href="/dashboard">
                <span className="nav-icon">
                  <i className="bx bx-bar-chart"></i>
                </span>
                <span className="nav-text">Dashboard</span>
              </Link>
            </li>
          )}

          {/* Lists */}
          {user && (
            <li className="nav-item">
              <Link className="nav-link" href="/lists">
                <span className="nav-icon">
                  <i className="bx bx-list-ul"></i>
                </span>
                <span className="nav-text">Lists</span>
              </Link>
            </li>
          )}

          {/* Admin */}
          {user?.isAdministrator && (
            <li className="nav-item">
              <Link className="nav-link" href="/admin">
                <span className="nav-icon">
                  <i className="bx bx-user-check"></i>
                </span>
                <span className="nav-text">Administration</span>
              </Link>
            </li>
          )}

          {/* User Menu Items at Bottom */}
          {user && (
            <>
              <li className="menu-title mt-3">Account</li>
              <AppSidebarUserMenu user={user} />
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
