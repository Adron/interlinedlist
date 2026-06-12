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
  isSubscriber?: boolean;
}

export default function UserDropdown({ user, isSubscriber = false }: UserDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoginAsOpen, setIsLoginAsOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close sub-menus when main dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setIsSettingsOpen(false);
      setIsLoginAsOpen(false);
    }
  }, [isOpen]);

  // Lazy-load accounts only when "Switch to" is first opened
  useEffect(() => {
    if (!isLoginAsOpen || accountsLoaded) return;
    setIsLoadingAccounts(true);
    fetch('/api/auth/accounts')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.accounts) {
          setAccounts(data.accounts);
          setCurrentUserId(data.currentUserId ?? null);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingAccounts(false);
        setAccountsLoaded(true);
      });
  }, [isLoginAsOpen, accountsLoaded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
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
        window.location.reload();
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
        <span className="d-flex align-items-center position-relative">
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
          {isSubscriber && (
            <span
              className="position-absolute bottom-0 end-0 rounded-circle bg-primary d-flex align-items-center justify-content-center"
              style={{ width: 14, height: 14 }}
              title="Subscriber"
            >
              <i className="bx bx-badge-check text-white" style={{ fontSize: 10 }} aria-hidden />
            </span>
          )}
        </span>
      </a>
      <div
        className={`dropdown-menu dropdown-menu-end ${isOpen ? 'show' : ''}`}
        aria-labelledby="page-header-user-dropdown"
        style={{ display: isOpen ? 'block' : 'none' }}
      >
        <h6 className="dropdown-header">Welcome!</h6>

        {/* Settings accordion */}
        <a
          className="dropdown-item d-flex align-items-center justify-content-between"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setIsSettingsOpen(!isSettingsOpen);
          }}
          aria-expanded={isSettingsOpen}
        >
          <span className="d-flex align-items-center">
            <i className="bx bx-cog align-middle me-2" style={{ fontSize: '18px' }}></i>
            <span className="align-middle">Settings</span>
          </span>
          <i
            className={`bx align-middle ${isSettingsOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}
            style={{ fontSize: '18px' }}
            aria-hidden="true"
          />
        </a>
        {isSettingsOpen && (
          <>
            <a
              className="dropdown-item ps-4"
              href="/settings"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                setIsSettingsOpen(false);
                router.push('/settings');
              }}
            >
              <i className="bx bx-slider-alt align-middle me-2" style={{ fontSize: '18px' }}></i>
              <span className="align-middle">Preferences</span>
            </a>
            <Link
              className="dropdown-item ps-4"
              href="/integrations"
              onClick={() => { setIsOpen(false); setIsSettingsOpen(false); }}
            >
              <i className="bx bx-plug align-middle me-2" style={{ fontSize: '18px' }}></i>
              <span className="align-middle">Integrations</span>
            </Link>
            <Link
              className="dropdown-item ps-4"
              href="/subscription"
              onClick={() => { setIsOpen(false); setIsSettingsOpen(false); }}
            >
              <i className="bx bx-credit-card align-middle me-2" style={{ fontSize: '18px' }}></i>
              <span className="align-middle">Subscription</span>
            </Link>
          </>
        )}

        <Link
          className="dropdown-item"
          href="/notifications"
          onClick={() => setIsOpen(false)}
        >
          <i className="bx bx-bell align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Notifications</span>
        </Link>

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
          href="/help"
          onClick={() => setIsOpen(false)}
        >
          <i className="bx bx-help-circle align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">Help</span>
        </Link>

        {/* Switch to / Add account - always visible, accounts lazy-loaded on first open */}
        <a
          className="dropdown-item d-flex align-items-center justify-content-between"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setIsLoginAsOpen(!isLoginAsOpen);
          }}
          aria-expanded={isLoginAsOpen}
        >
          <span className="d-flex align-items-center">
            <i className="bx bx-user-circle align-middle me-2" style={{ fontSize: '18px' }}></i>
            <span className="align-middle">Switch to</span>
          </span>
          <i
            className={`bx align-middle ${isLoginAsOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}
            style={{ fontSize: '18px' }}
            aria-hidden="true"
          />
        </a>
        {isLoginAsOpen && (
          <>
            {isLoadingAccounts ? (
              <div className="dropdown-item ps-4 d-flex align-items-center text-muted">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                <span>Loading...</span>
              </div>
            ) : (
              <>
                {accounts.map((acc) => {
                  const accDisplayName = acc.displayName || acc.username;
                  const isCurrent = acc.id === currentUserId;
                  return (
                    <a
                      key={acc.id}
                      className={`dropdown-item d-flex align-items-center ps-4 ${isCurrent ? 'active' : ''}`}
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
                  className="dropdown-item d-flex align-items-center ps-4"
                  href="/login?add=1"
                  onClick={() => {
                    setIsOpen(false);
                    setIsLoginAsOpen(false);
                  }}
                >
                  <i className="bx bx-plus-circle align-middle me-2" style={{ fontSize: '18px' }}></i>
                  <span className="align-middle">Add account</span>
                </Link>
              </>
            )}
          </>
        )}

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
