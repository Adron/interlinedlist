'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminTab {
  href: string;
  label: string;
  icon: string;
}

const TABS: AdminTab[] = [
  { href: '/admin', label: 'Users', icon: 'bx-group' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'bx-bar-chart-alt' },
  { href: '/admin/support-links', label: 'Support Links', icon: 'bx-link' },
  { href: '/admin/email-logging', label: 'Email Logging', icon: 'bx-envelope' },
  { href: '/admin/blog', label: 'Blogging', icon: 'bx-news' },
];

function isTabActive(href: string, pathname: string): boolean {
  if (href === '/admin') {
    // Users tab also owns the /admin/users/* sub-routes.
    return pathname === '/admin' || pathname.startsWith('/admin/users');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <ul className="nav nav-tabs mb-4" role="tablist">
      {TABS.map((tab) => {
        const active = isTabActive(tab.href, pathname);
        return (
          <li className="nav-item" role="presentation" key={tab.href}>
            <Link
              href={tab.href}
              className={`nav-link ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <i className={`bx ${tab.icon} me-1`}></i>
              {tab.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
