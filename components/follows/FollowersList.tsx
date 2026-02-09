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
  currentUserId?: string | null;
}

export default function FollowersList({
  userId,
  initialFollowers = [],
  initialTotal = 0,
  showStatus = false,
  currentUserId,
}: FollowersListProps) {
  const [followers, setFollowers] = useState<Follower[]>(initialFollowers);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(initialFollowers.length);
  const [hasMore, setHasMore] = useState(initialFollowers.length < initialTotal);
  const [mutualConnections, setMutualConnections] = useState<Record<string, { mutualFollowers: number; mutualFollowing: number }>>({});

  // Fetch mutual connections for current user viewing their own followers
  useEffect(() => {
    if (!currentUserId || currentUserId !== userId) return;

    const fetchMutualConnections = async () => {
      const connections: Record<string, { mutualFollowers: number; mutualFollowing: number }> = {};
      
      for (const follower of followers) {
        try {
          const response = await fetch(`/api/follow/${follower.id}/mutual?otherUserId=${currentUserId}`);
          if (response.ok) {
            const data = await response.json();
            connections[follower.id] = {
              mutualFollowers: data.mutualFollowers || 0,
              mutualFollowing: data.mutualFollowing || 0,
            };
          }
        } catch (err) {
          // Silently fail for individual mutual connection fetches
        }
      }
      
      setMutualConnections(connections);
    };

    if (followers.length > 0) {
      fetchMutualConnections();
    }
  }, [followers, currentUserId, userId]);

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
                  <div className="ms-3 flex-grow-1">
                    <div className="fw-bold text-body">
                      {follower.displayName || follower.username}
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <small className="text-muted">@{follower.username}</small>
                      {currentUserId === userId && mutualConnections[follower.id] && (
                        <>
                          {mutualConnections[follower.id].mutualFollowers > 0 && (
                            <small className="text-muted">
                              {mutualConnections[follower.id].mutualFollowers} mutual follower{mutualConnections[follower.id].mutualFollowers !== 1 ? 's' : ''}
                            </small>
                          )}
                          {mutualConnections[follower.id].mutualFollowing > 0 && (
                            <small className="text-muted">
                              {mutualConnections[follower.id].mutualFollowing} mutual following
                            </small>
                          )}
                        </>
                      )}
                    </div>
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
