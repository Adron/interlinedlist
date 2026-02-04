'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

function getPageTitle(pathname: string): string {
  // Remove leading slash and split path
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return 'InterlinedList';
  }
  
  const route = segments[0];
  
  // Map routes to display names
  const routeMap: Record<string, string> = {
    'dashboard': 'Dashboard',
    'lists': 'Lists',
    'admin': 'Administration',
    'settings': 'Settings',
    'help': 'Help',
    'login': 'Login',
    'register': 'Register',
    'forgot-password': 'Forgot Password',
    'reset-password': 'Reset Password',
    'verify-email': 'Verify Email',
  };
  
  // Handle special cases
  if (route === 'lists' && segments.length > 1) {
    if (segments[1] === 'new') {
      return 'Create New List';
    }
    // For list detail pages, show "Lists"
    return 'Lists';
  }
  
  if (route === 'admin' && segments.length > 1) {
    if (segments[1] === 'users' && segments[2] === 'new') {
      return 'Add New User';
    }
  }
  
  if (route === 'user' && segments.length > 1) {
    // Capitalize first letter of username
    const username = segments[1];
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
  
  return routeMap[route] || 'InterlinedList';
}

export default function NavigationTitle() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
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
        {pageTitle}
      </span>
    </Link>
  );
}
