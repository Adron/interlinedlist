import Link from 'next/link';

export interface ProfileHeaderUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
}

interface ProfileHeaderProps {
  user: ProfileHeaderUser;
}

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  const displayName = user.displayName || user.username;
  const initials = displayName[0].toUpperCase();

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
            <h1 className="h4 mb-1">{displayName}</h1>
            <p className="text-muted mb-0">@{user.username}</p>
            {user.bio && (
              <p className="mt-2 mb-0 text-body">{user.bio}</p>
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
