'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AppSidebarUserMenuProps {
  user: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

export default function AppSidebarUserMenu({ user }: AppSidebarUserMenuProps) {
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

  return (
    <>
      {/* My Account */}
      <li className="nav-item">
        <Link className="nav-link" href="/settings">
          <span className="nav-icon">
            <i className="bx bx-user"></i>
          </span>
          <span className="nav-text">My Account</span>
        </Link>
      </li>

      {/* Settings */}
      <li className="nav-item">
        <Link className="nav-link" href="/settings">
          <span className="nav-icon">
            <i className="bx bx-cog"></i>
          </span>
          <span className="nav-text">Settings</span>
        </Link>
      </li>

      {/* Help */}
      <li className="nav-item">
        <Link className="nav-link" href="/help">
          <span className="nav-icon">
            <i className="bx bx-help-circle"></i>
          </span>
          <span className="nav-text">Help</span>
        </Link>
      </li>

      {/* Divider */}
      <li className="nav-item">
        <div className="dropdown-divider my-2"></div>
      </li>

      {/* Logout */}
      <li className="nav-item">
        <a
          className="nav-link text-danger"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          <span className="nav-icon">
            <i className="bx bx-log-out"></i>
          </span>
          <span className="nav-text">Logout</span>
        </a>
      </li>
    </>
  );
}
