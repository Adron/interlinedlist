'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import AvatarPlaceholder from '@/components/AvatarPlaceholder';

interface Following {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  followId: string;
  status: 'pending' | 'approved';
  createdAt: string;
}

interface FollowingListProps {
  userId: string;
  initialFollowing?: Following[];
  initialTotal?: number;
  showStatus?: boolean;
  currentUserId?: string | null;
}

export default function FollowingList({
  userId,
  initialFollowing = [],
  initialTotal = 0,
  showStatus = false,
  currentUserId,
}: FollowingListProps) {
  const [following, setFollowing] = useState<Following[]>(initialFollowing);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(initialFollowing.length);
  const [hasMore, setHasMore] = useState(initialFollowing.length < initialTotal);
  const [mutualConnections, setMutualConnections] = useState<Record<string, { mutualFollowers: number; mutualFollowing: number }>>({});

  // Fetch mutual connections for current user viewing their own following
  useEffect(() => {
    if (!currentUserId || currentUserId !== userId) return;

    const fetchMutualConnections = async () => {
      const connections: Record<string, { mutualFollowers: number; mutualFollowing: number }> = {};
      
      for (const user of following) {
        try {
          const response = await fetch(`/api/follow/${user.id}/mutual?otherUserId=${currentUserId}`);
          if (response.ok) {
            const data = await response.json();
            connections[user.id] = {
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

    if (following.length > 0) {
      fetchMutualConnections();
    }
  }, [following, currentUserId, userId]);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/follow/${userId}/following?limit=20&offset=${offset}`);
      if (!response.ok) {
        throw new Error('Failed to load following');
      }

      const data = await response.json();
      setFollowing((prev) => [...prev, ...data.following]);
      setTotal(data.pagination.total);
      setOffset((prev) => prev + data.following.length);
      setHasMore(data.pagination.hasMore);
    } catch (err: any) {
      setError(err.message || 'Failed to load following');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0">Following ({total})</h5>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {following.length === 0 && !loading ? (
          <p className="text-muted mb-0">Not following anyone yet.</p>
        ) : (
          <div className="list-group list-group-flush">
            {following.map((user) => (
              <div
                key={user.followId}
                className="list-group-item d-flex align-items-center justify-content-between"
              >
                <Link
                  href={`/user/${encodeURIComponent(user.username)}`}
                  className="d-flex align-items-center text-decoration-none flex-grow-1"
                >
                  {user.avatar ? (
                    <Avatar
                      src={user.avatar}
                      alt={user.displayName || user.username}
                      size={40}
                    />
                  ) : (
                    <AvatarPlaceholder
                      name={user.displayName || user.username}
                      size={40}
                    />
                  )}
                  <div className="ms-3 flex-grow-1">
                    <div className="fw-bold text-body">
                      {user.displayName || user.username}
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <small className="text-muted">@{user.username}</small>
                      {currentUserId === userId && mutualConnections[user.id] && (
                        <>
                          {mutualConnections[user.id].mutualFollowers > 0 && (
                            <small className="text-muted">
                              {mutualConnections[user.id].mutualFollowers} mutual follower{mutualConnections[user.id].mutualFollowers !== 1 ? 's' : ''}
                            </small>
                          )}
                          {mutualConnections[user.id].mutualFollowing > 0 && (
                            <small className="text-muted">
                              {mutualConnections[user.id].mutualFollowing} mutual following
                            </small>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Link>
                {showStatus && user.status === 'pending' && (
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
