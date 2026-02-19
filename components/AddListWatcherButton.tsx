'use client';

import { useState, useEffect } from 'react';

interface AddListWatcherButtonProps {
  listId: string;
  /** When false, hide the button (e.g. own list or not logged in) */
  show?: boolean;
}

export default function AddListWatcherButton({ listId, show = true }: AddListWatcherButtonProps) {
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!show) {
      setChecking(false);
      return;
    }
    fetch(`/api/lists/${listId}/watchers/me`)
      .then((res) => (res.ok ? res.json() : { watching: false }))
      .then((data) => setWatching(data.watching ?? false))
      .catch(() => setWatching(false))
      .finally(() => setChecking(false));
  }, [listId, show]);

  const handleClick = async () => {
    if (watching || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lists/${listId}/watchers`, {
        method: 'POST',
      });
      if (res.ok) {
        setWatching(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!show || checking) return null;
  if (watching) {
    return (
      <span className="badge bg-secondary">Watching</span>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? 'Adding...' : 'Add self as watcher to list?'}
    </button>
  );
}
