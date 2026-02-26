'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ListOption {
  id: string;
  title: string;
}

interface EditParentFormProps {
  listId: string;
  initialParentId: string | null;
}

export default function EditParentForm({ listId, initialParentId }: EditParentFormProps) {
  const router = useRouter();
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const [availableParents, setAvailableParents] = useState<ListOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingParents, setLoadingParents] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchParents = async () => {
      setLoadingParents(true);
      try {
        const res = await fetch('/api/lists?limit=100');
        if (res.ok) {
          const data = await res.json();
          const lists = (data.lists || []).filter((l: ListOption) => l.id !== listId);
          setAvailableParents(lists);
        }
      } catch {
        setAvailableParents([]);
      } finally {
        setLoadingParents(false);
      }
    };
    fetchParents();
  }, [listId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: parentId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update parent');
      }
      router.push(`/lists/${listId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update parent');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/lists/${listId}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="mb-4">
        <label className="form-label fw-medium">Parent list</label>
        <select
          className="form-select"
          value={parentId || ''}
          onChange={(e) => setParentId(e.target.value || null)}
          disabled={loadingParents}
        >
          <option value="">None</option>
          {availableParents.map((list) => (
            <option key={list.id} value={list.id}>
              {list.title}
            </option>
          ))}
        </select>
        <small className="form-text text-muted">
          Select a parent list to organize lists hierarchically. A list cannot be its own parent.
        </small>
      </div>
      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={loading || loadingParents}>
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
