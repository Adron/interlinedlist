'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Account {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

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
  const [isLoginAsOpen, setIsLoginAsOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const loginAsRef = useRef<HTMLDivElement>(null);

  // Fetch accounts when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/auth/accounts')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.accounts) {
            setAccounts(data.accounts);
            setCurrentUserId(data.currentUserId ?? null);
          }
        })
        .catch(() => {});
    } else {
      setIsLoginAsOpen(false);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
      if (loginAsRef.current && !loginAsRef.current.contains(target) && !dropdownRef.current?.contains(target)) {
        setIsLoginAsOpen(false);
      }
    };

    if (isOpen || isLoginAsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isLoginAsOpen]);

  const handleLogout = async (all = false) => {
    try {
      const url = all ? '/api/auth/logout?all=true' : '/api/auth/logout';
      const response = await fetch(url, { method: 'POST' });

      if (response.ok) {
        setIsOpen(false);
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSwitchAccount = async (userId: string) => {
    if (userId === currentUserId) {
      setIsLoginAsOpen(false);
      return;
    }
    try {
      const response = await fetch('/api/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        setIsOpen(false);
        setIsLoginAsOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Switch account error:', error);
    }
  };

  const displayName = user.displayName || user.username;
  const initials = displayName[0]?.toUpperCase() ?? '?';
  const hasMultipleAccounts = accounts.length > 1;

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
        <h6 className="dropdown-header">Welcome!</h6>

        <a
          className="dropdown-item"
          href="/settings"
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(false);
            router.push('/settings');
          }}
        >
          <i className="bx bx-cog align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Settings</span>
        </a>

        <Link
          className="dropdown-item"
          href="/user/organizations"
          onClick={() => setIsOpen(false)}
        >
          <i className="bx bx-group align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">My Organizations</span>
        </Link>

        <Link
          className="dropdown-item"
          href="/documents"
          onClick={() => setIsOpen(false)}
        >
          <i className="bx bx-note align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Documents</span>
        </Link>

        <Link
          className="dropdown-item"
          href="/help/tooling"
          onClick={() => setIsOpen(false)}
        >
          <i className="bx bx-sync align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Tooling</span>
        </Link>

        <Link
          className="dropdown-item"
          href="/help"
          onClick={() => setIsOpen(false)}
        >
          <i className="bx bx-help-circle align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Help</span>
        </Link>

        {/* Login as - nested dropend submenu */}
        <div
          className="dropend position-relative"
          ref={loginAsRef}
          onMouseEnter={() => setIsLoginAsOpen(true)}
          onMouseLeave={() => setIsLoginAsOpen(false)}
        >
          <a
            className="dropdown-item dropdown-toggle d-flex align-items-center"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setIsLoginAsOpen(!isLoginAsOpen);
            }}
          >
            <i className="bx bx-user-circle align-middle me-2" style={{ fontSize: '18px' }}></i>
            <span className="align-middle">Login as</span>
          </a>
          <div
            className={`dropdown-menu ${isLoginAsOpen ? 'show' : ''}`}
            style={{
              display: isLoginAsOpen ? 'block' : 'none',
              position: 'absolute',
              left: '100%',
              top: 0,
              marginLeft: '2px',
            }}
          >
            {accounts.map((acc) => {
              const accDisplayName = acc.displayName || acc.username;
              const isCurrent = acc.id === currentUserId;
              return (
                <a
                  key={acc.id}
                  className={`dropdown-item d-flex align-items-center ${isCurrent ? 'active' : ''}`}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSwitchAccount(acc.id);
                  }}
                  aria-current={isCurrent ? 'true' : undefined}
                >
                  {acc.avatar ? (
                    <img
                      src={acc.avatar}
                      alt=""
                      className="rounded-circle me-2"
                      width="24"
                      height="24"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      className="rounded-circle me-2 d-flex align-items-center justify-content-center"
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: 'var(--bs-secondary)',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {(accDisplayName[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                  <span className="flex-grow-1">{accDisplayName}</span>
                  {isCurrent && (
                    <i className="bx bx-check ms-2" style={{ fontSize: '18px' }} aria-hidden="true"></i>
                  )}
                </a>
              );
            })}
            <div className="dropdown-divider my-1"></div>
            <Link
              className="dropdown-item d-flex align-items-center"
              href="/login?add=1"
              onClick={() => {
                setIsOpen(false);
                setIsLoginAsOpen(false);
              }}
            >
              <i className="bx bx-plus-circle align-middle me-2" style={{ fontSize: '18px' }}></i>
              <span className="align-middle">Add account</span>
            </Link>
          </div>
        </div>

        <div className="dropdown-divider my-1"></div>

        <a
          className="dropdown-item text-danger"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(false);
            handleLogout(false);
          }}
        >
          <i className="bx bx-log-out align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Log out</span>
        </a>

        {hasMultipleAccounts && (
          <a
            className="dropdown-item text-danger"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setIsOpen(false);
              handleLogout(true);
            }}
          >
            <i className="bx bx-log-out-circle align-middle me-2" style={{ fontSize: '18px' }}></i>
            <span className="align-middle">Log out of all accounts</span>
          </a>
        )}
      </div>
    </div>
  );
}
