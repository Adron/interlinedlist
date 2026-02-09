'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface FollowNavigationProps {
  username: string;
  isOwnProfile?: boolean;
}

export default function FollowNavigation({ username, isOwnProfile = false }: FollowNavigationProps) {
  const pathname = usePathname();
  const isFollowersPage = pathname?.includes('/followers');
  const isFollowingPage = pathname?.includes('/following');

  return (
    <div className="card mb-4">
      <div className="card-body">
        <ul className="nav nav-tabs nav-tabs-bordered" role="tablist">
          <li className="nav-item" role="presentation">
            <Link
              href={`/user/${encodeURIComponent(username)}/followers`}
              className={`nav-link ${isFollowersPage ? 'active' : ''}`}
              role="tab"
            >
              <i className="bx bx-user-check me-2"></i>
              Followers
            </Link>
          </li>
          <li className="nav-item" role="presentation">
            <Link
              href={`/user/${encodeURIComponent(username)}/following`}
              className={`nav-link ${isFollowingPage ? 'active' : ''}`}
              role="tab"
            >
              <i className="bx bx-user-plus me-2"></i>
              Following
            </Link>
          </li>
        </ul>
        {isOwnProfile && (
          <div className="mt-3">
            <Link href="/people" className="text-decoration-none">
              <i className="bx bx-arrow-back me-1"></i>
              Back to People
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
