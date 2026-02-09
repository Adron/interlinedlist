import Link from 'next/link';
import FollowButton from '@/components/FollowButton';

export interface ProfileHeaderUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  followerCount?: number;
  followingCount?: number;
  isPrivateAccount?: boolean | null;
}

interface ProfileHeaderProps {
  user: ProfileHeaderUser;
  currentUserId?: string | null;
  followStatus?: 'none' | 'pending' | 'approved';
}

export default function ProfileHeader({ user, currentUserId, followStatus = 'none' }: ProfileHeaderProps) {
  const displayName = user.displayName || user.username;
  const initials = displayName[0].toUpperCase();
  const isOwnProfile = currentUserId === user.id;

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex align-items-start gap-3 flex-wrap">
          {user.avatar ? (
            <img
              className="rounded-circle flex-shrink-0"
              src={user.avatar}
              alt={displayName}
              width="80"
              height="80"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'var(--bs-secondary)',
                color: 'white',
                fontSize: '2rem',
                fontWeight: 'bold',
              }}
            >
              {initials}
            </div>
          )}
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
              <div className="flex-grow-1 min-w-0">
                <h1 className="h4 mb-1">{displayName}</h1>
                <p className="text-muted mb-0">@{user.username}</p>
                {user.isPrivateAccount && (
                  <span className="badge bg-secondary mt-1">
                    <i className="bx bx-lock me-1"></i>
                    Private Account
                  </span>
                )}
                {user.bio && (
                  <p className="mt-2 mb-0 text-body">{user.bio}</p>
                )}
              </div>
              {currentUserId && !isOwnProfile && (
                <div className="flex-shrink-0">
                  <FollowButton
                    userId={user.id}
                    initialStatus={followStatus}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* Follower/Following counts */}
            {(user.followerCount !== undefined || user.followingCount !== undefined) && (
              <div className="mt-3">
                <div className="d-flex gap-3 flex-wrap">
                  <Link
                    href={isOwnProfile ? '/people' : `/user/${encodeURIComponent(user.username)}/followers`}
                    className="text-decoration-none"
                  >
                    <div className="d-flex align-items-center gap-2 p-2 rounded border border-primary border-opacity-25 follower-following-card" style={{ cursor: 'pointer' }}>
                      <i className="bx bx-user-check text-primary fs-20"></i>
                      <div>
                        <div className="fw-bold fs-5 text-body">{user.followerCount ?? 0}</div>
                        <small className="text-muted">Followers</small>
                      </div>
                    </div>
                  </Link>
                  <Link
                    href={isOwnProfile ? '/people' : `/user/${encodeURIComponent(user.username)}/following`}
                    className="text-decoration-none"
                  >
                    <div className="d-flex align-items-center gap-2 p-2 rounded border border-info border-opacity-25 follower-following-card" style={{ cursor: 'pointer' }}>
                      <i className="bx bx-user-plus text-info fs-20"></i>
                      <div>
                        <div className="fw-bold fs-5 text-body">{user.followingCount ?? 0}</div>
                        <small className="text-muted">Following</small>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-top">
          <Link href="/" className="text-decoration-none">
            ← Back to feed
          </Link>
        </div>
      </div>
    </div>
  );
}
