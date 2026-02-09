'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import AvatarPlaceholder from '@/components/AvatarPlaceholder';

interface FollowRequest {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  followId: string;
  createdAt: string;
}

interface FollowRequestsProps {
  initialRequests?: FollowRequest[];
}

export default function FollowRequests({ initialRequests = [] }: FollowRequestsProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<FollowRequest[]>(initialRequests);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/follow/requests');
      if (!response.ok) {
        throw new Error('Failed to load follow requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load follow requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRequests.length === 0) {
      fetchRequests();
    }
  }, []);

  const handleApprove = async (followerId: string) => {
    if (processingIds.has(followerId)) return;

    setProcessingIds((prev) => new Set(prev).add(followerId));
    setError(null);

    try {
      const response = await fetch(`/api/follow/${followerId}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve request');
      }

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== followerId));
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to approve request');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(followerId);
        return next;
      });
    }
  };

  const handleReject = async (followerId: string) => {
    if (processingIds.has(followerId)) return;

    setProcessingIds((prev) => new Set(prev).add(followerId));
    setError(null);

    try {
      const response = await fetch(`/api/follow/${followerId}/reject`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject request');
      }

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== followerId));
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(followerId);
        return next;
      });
    }
  };

  if (requests.length === 0 && !loading) {
    return null; // Don't render if no requests
  }

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Follow Requests ({requests.length})</h5>
        {requests.length > 0 && (
          <button
            className="btn btn-sm btn-link text-decoration-none p-0"
            onClick={fetchRequests}
            disabled={loading}
            title="Refresh"
          >
            <i className="bx bx-refresh"></i>
          </button>
        )}
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {loading && requests.length === 0 ? (
          <div className="text-center py-3">
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span className="ms-2">Loading requests...</span>
          </div>
        ) : requests.length === 0 ? (
          <p className="text-muted mb-0">No pending follow requests.</p>
        ) : (
          <div className="list-group list-group-flush">
            {requests.map((request) => {
              const isProcessing = processingIds.has(request.id);
              return (
                <div
                  key={request.followId}
                  className="list-group-item d-flex align-items-center justify-content-between"
                >
                  <Link
                    href={`/user/${encodeURIComponent(request.username)}`}
                    className="d-flex align-items-center text-decoration-none flex-grow-1"
                  >
                    {request.avatar ? (
                      <Avatar
                        src={request.avatar}
                        alt={request.displayName || request.username}
                        size={40}
                      />
                    ) : (
                      <AvatarPlaceholder
                        name={request.displayName || request.username}
                        size={40}
                      />
                    )}
                    <div className="ms-3">
                      <div className="fw-bold text-body">
                        {request.displayName || request.username}
                      </div>
                      <small className="text-muted">@{request.username}</small>
                    </div>
                  </Link>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleApprove(request.id)}
                      disabled={isProcessing}
                      title="Approve"
                    >
                      {isProcessing ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <>
                          <i className="bx bx-check me-1"></i>
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleReject(request.id)}
                      disabled={isProcessing}
                      title="Reject"
                    >
                      {isProcessing ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <>
                          <i className="bx bx-x me-1"></i>
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
