'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserDropdownProps {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

export default function UserDropdown({ user }: UserDropdownProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const displayName = user.displayName || user.username;
  const initials = displayName[0].toUpperCase();

  return (
    <div className="dropdown topbar-item">
      <a
        type="button"
        className="topbar-button"
        id="page-header-user-dropdown"
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
        style={{ cursor: 'pointer', textDecoration: 'none' }}
      >
        <span className="d-flex align-items-center">
          {user.avatar ? (
            <img
              className="rounded-circle"
              width="32"
              height="32"
              src={user.avatar}
              alt={displayName}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--bs-secondary)',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}
        </span>
      </a>
      <div className="dropdown-menu dropdown-menu-end" aria-labelledby="page-header-user-dropdown">
        {/* Welcome header */}
        <h6 className="dropdown-header">Welcome!</h6>

        {/* My Account */}
        <Link className="dropdown-item" href="/settings">
          <i className="bx bx-user align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">My Account</span>
        </Link>

        {/* Settings */}
        <Link className="dropdown-item" href="/settings">
          <i className="bx bx-cog align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Settings</span>
        </Link>

        {/* Help */}
        <Link className="dropdown-item" href="/help">
          <i className="bx bx-life-buoy align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Help</span>
        </Link>

        {/* Divider */}
        <div className="dropdown-divider my-1"></div>

        {/* Logout */}
        <a
          className="dropdown-item text-danger"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          <i className="bx bx-log-out align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Logout</span>
        </a>
      </div>
    </div>
  );
}
