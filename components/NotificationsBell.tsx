'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { isSafeAppPath } from '@/lib/notifications/safe-navigate-url';

type TrayItem = {
  id: string;
  title: string;
  body: string;
  actionUrl: string | null;
  createdAt: string;
};

function formatBadgeCount(n: number): string {
  if (n > 99) return '99+';
  return String(n);
}

function previewBody(body: string, maxLen = 160): string {
  const t = body.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

export default function NotificationsBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<TrayItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadTray = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?scope=tray`, { credentials: 'include' });
      if (!res.ok) {
        setItems([]);
        setUnreadCount(0);
        return;
      }
      const data = (await res.json()) as { unreadCount?: number; items?: TrayItem[] };
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTray();
  }, [loadTray, pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      loadTray();
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, loadTray]);

  const handleItemClick = async (item: TrayItem) => {
    try {
      await fetch(`/api/notifications/${encodeURIComponent(item.id)}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
    } catch {
      /* still navigate */
    }
    setIsOpen(false);
    setUnreadCount((c) => Math.max(0, c - 1));
    setItems((list) => list.filter((i) => i.id !== item.id));
    router.refresh();
    if (item.actionUrl && isSafeAppPath(item.actionUrl)) {
      router.push(item.actionUrl);
    }
  };

  return (
    <div className="dropdown topbar-item" ref={dropdownRef}>
      <button
        type="button"
        className="topbar-button btn btn-link text-decoration-none d-flex align-items-center position-relative"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Notifications"
        onClick={() => setIsOpen((o) => !o)}
        style={{
          color: 'var(--bs-topbar-item-color, var(--color-text))',
          border: 'none',
          background: 'transparent',
          padding: '0.25rem 0.5rem',
        }}
      >
        <i className="bx bx-bell fs-22 align-middle" aria-hidden />
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: '0.65rem', minWidth: '1.1rem' }}
          >
            {formatBadgeCount(unreadCount)}
            <span className="visually-hidden"> unread notifications</span>
          </span>
        )}
      </button>
      <div
        className={`dropdown-menu dropdown-menu-end p-0 ${isOpen ? 'show' : ''}`}
        style={{
          display: isOpen ? 'block' : 'none',
          minWidth: 'min(100vw - 2rem, 360px)',
          maxHeight: 'min(70vh, 420px)',
        }}
      >
        <div className="px-3 py-2 border-bottom d-flex align-items-center justify-content-between">
          <span className="fw-semibold small">Notifications</span>
          {loading && (
            <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden />
          )}
        </div>
        <div className="overflow-auto" style={{ maxHeight: 'min(55vh, 340px)' }}>
          {items.length === 0 && !loading ? (
            <div className="px-3 py-4 text-center text-muted small">No unread notifications</div>
          ) : (
            <ul className="list-group list-group-flush">
              {items.map((item) => (
                <li key={item.id} className="list-group-item list-group-item-action p-0">
                  <button
                    type="button"
                    className="btn btn-link text-start text-decoration-none w-100 p-3 rounded-0 text-body"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="fw-semibold small mb-1">{item.title}</div>
                    <div className="text-muted small text-wrap" style={{ whiteSpace: 'normal' }}>
                      {previewBody(item.body)}
                    </div>
                    <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-top px-2 py-2 text-center small">
          <Link
            href="/notifications"
            className="text-decoration-none"
            onClick={() => setIsOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      </div>
    </div>
  );
}
