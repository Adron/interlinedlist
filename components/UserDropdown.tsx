'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
    <div className="dropdown topbar-item" ref={dropdownRef}>
      <a
        type="button"
        className="topbar-button"
        id="page-header-user-dropdown"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
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
      <div 
        className={`dropdown-menu dropdown-menu-end ${isOpen ? 'show' : ''}`}
        aria-labelledby="page-header-user-dropdown"
        style={{ display: isOpen ? 'block' : 'none' }}
      >
        {/* Welcome header */}
        <h6 className="dropdown-header">Welcome!</h6>

        {/* Settings */}
        <Link 
          className="dropdown-item" 
          href="/settings"
          onClick={() => setIsOpen(false)}
        >
          <i className="bx bx-cog align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Settings</span>
        </Link>

        {/* My Organizations */}
        <Link 
          className="dropdown-item" 
          href="/user/organizations"
          onClick={() => setIsOpen(false)}
        >
          <i className="bx bx-group align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">My Organizations</span>
        </Link>

        {/* Help */}
        <Link 
          className="dropdown-item" 
          href="/help"
          onClick={() => setIsOpen(false)}
        >
          <i className="bx bx-help-circle align-middle me-2" style={{ fontSize: '18px' }}></i>
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
            setIsOpen(false);
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
