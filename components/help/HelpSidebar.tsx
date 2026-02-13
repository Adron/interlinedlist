'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getHelpTopics } from '@/lib/help-config';

interface HelpSidebarProps {
  /** When true, links dismiss the offcanvas on click (for mobile) */
  inOffcanvas?: boolean;
}

export default function HelpSidebar({ inOffcanvas }: HelpSidebarProps) {
  const pathname = usePathname();
  const topics = getHelpTopics();

  return (
    <nav className="help-sidebar nav flex-column">
      {topics.map((topic) => {
        const href = `/help/${topic.slug}`;
        const isActive = pathname === href;
        return (
          <Link
            key={topic.slug}
            href={href}
            className={`nav-link ${isActive ? 'active' : ''}`}
            {...(inOffcanvas ? { 'data-bs-dismiss': 'offcanvas' } : {})}
          >
            {topic.title}
          </Link>
        );
      })}
    </nav>
  );
}
