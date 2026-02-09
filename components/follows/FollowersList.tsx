'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import AvatarPlaceholder from '@/components/AvatarPlaceholder';

interface Follower {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  followId: string;
  status: 'pending' | 'approved';
  createdAt: string;
}

interface FollowersListProps {
  userId: string;
  initialFollowers?: Follower[];
  initialTotal?: number;
  showStatus?: boolean;
}

export default function FollowersList({
  userId,
  initialFollowers = [],
  initialTotal = 0,
  showStatus = false,
}: FollowersListProps) {
  const [followers, setFollowers] = useState<Follower[]>(initialFollowers);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(initialFollowers.length);
  const [hasMore, setHasMore] = useState(initialFollowers.length < initialTotal);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/follow/${userId}/followers?limit=20&offset=${offset}`);
      if (!response.ok) {
        throw new Error('Failed to load followers');
      }

      const data = await response.json();
      setFollowers((prev) => [...prev, ...data.followers]);
      setTotal(data.pagination.total);
      setOffset((prev) => prev + data.followers.length);
      setHasMore(data.pagination.hasMore);
    } catch (err: any) {
      setError(err.message || 'Failed to load followers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0">Followers ({total})</h5>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {followers.length === 0 && !loading ? (
          <p className="text-muted mb-0">No followers yet.</p>
        ) : (
          <div className="list-group list-group-flush">
            {followers.map((follower) => (
              <div
                key={follower.followId}
                className="list-group-item d-flex align-items-center justify-content-between"
              >
                <Link
                  href={`/user/${encodeURIComponent(follower.username)}`}
                  className="d-flex align-items-center text-decoration-none flex-grow-1"
                >
                  {follower.avatar ? (
                    <Avatar
                      src={follower.avatar}
                      alt={follower.displayName || follower.username}
                      size={40}
                    />
                  ) : (
                    <AvatarPlaceholder
                      name={follower.displayName || follower.username}
                      size={40}
                    />
                  )}
                  <div className="ms-3">
                    <div className="fw-bold text-body">
                      {follower.displayName || follower.username}
                    </div>
                    <small className="text-muted">@{follower.username}</small>
                  </div>
                </Link>
                {showStatus && follower.status === 'pending' && (
                  <span className="badge bg-warning">Pending</span>
                )}
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-3 text-center">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
