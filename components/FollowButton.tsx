'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FollowButtonProps {
  userId: string;
  initialStatus?: 'none' | 'pending' | 'approved';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onStatusChange?: (status: 'none' | 'pending' | 'approved') => void;
}

export default function FollowButton({
  userId,
  initialStatus = 'none',
  size = 'md',
  className = '',
  onStatusChange,
}: FollowButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'none' | 'pending' | 'approved'>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  // Fetch current status on mount if not provided
  useEffect(() => {
    if (initialStatus === 'none') {
      fetchStatus();
    }
  }, [userId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/follow/${userId}/status`);
      if (response.ok) {
        const data = await response.json();
        const newStatus = data.status === 'pending' ? 'pending' : data.status === 'approved' ? 'approved' : 'none';
        setStatus(newStatus);
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      }
    } catch (err) {
      // Silently fail - status will remain as 'none'
      console.error('Failed to fetch follow status:', err);
    }
  };

  const handleFollow = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/follow/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to follow user');
      }

      // Update status based on response
      const newStatus = data.follow?.status === 'pending' ? 'pending' : 'approved';
      setStatus(newStatus);
      if (onStatusChange) {
        onStatusChange(newStatus);
      }

      // Refresh the page to update follower counts
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Follow error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/follow/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unfollow user');
      }

      setStatus('none');
      if (onStatusChange) {
        onStatusChange('none');
      }

      // Refresh the page to update follower counts
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Unfollow error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  const buttonClass = `btn ${sizeClasses[size]} ${className}`.trim();

  if (status === 'approved') {
    return (
      <div>
        <button
          onClick={handleUnfollow}
          disabled={loading}
          className={`${buttonClass} btn-outline-secondary`}
          title="Unfollow"
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Unfollowing...
            </>
          ) : (
            <>
              <i className="bx bx-user-check me-1"></i>
              Unfollow
            </>
          )}
        </button>
        {error && (
          <small className="text-danger d-block mt-1">{error}</small>
        )}
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div>
        <button
          disabled
          className={`${buttonClass} btn-secondary`}
          title="Follow request pending"
        >
          <i className="bx bx-time me-1"></i>
          Pending
        </button>
        {error && (
          <small className="text-danger d-block mt-1">{error}</small>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleFollow}
        disabled={loading}
        className={`${buttonClass} btn-primary`}
        title="Follow"
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            Following...
          </>
        ) : (
          <>
            <i className="bx bx-user-plus me-1"></i>
            Follow
          </>
        )}
      </button>
      {error && (
        <small className="text-danger d-block mt-1">{error}</small>
      )}
    </div>
  );
}
