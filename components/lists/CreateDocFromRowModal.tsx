'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

interface CreateDocFromRowModalProps {
  open: boolean;
  onClose: () => void;
  markdown: string;
  title: string;
  relativePath: string;
}

export default function CreateDocFromRowModal({
  open,
  onClose,
  markdown,
  title,
  relativePath,
}: CreateDocFromRowModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setLoading(false);
    }
  }, [open, markdown, title, relativePath]);

  if (!open) {
    return null;
  }

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled',
          content: markdown,
          relativePath,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.document?.id) {
        onClose();
        router.push(`/documents/${data.document.id}`);
        return;
      }
      const msg = typeof data.error === 'string' ? data.error : 'Failed to create document';
      setError(msg);
    } catch {
      setError('Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  const subscribeHint =
    error.toLowerCase().includes('subscribe') || error.toLowerCase().includes('subscription');

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="createDocFromRowTitle"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="createDocFromRowTitle">
              Create document from row
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={loading}
            />
          </div>
          <div className="modal-body" style={{ maxHeight: 'min(60vh, 480px)', overflowY: 'auto' }}>
            <p className="text-muted small mb-2">
              Preview (read-only). Confirm to save as a new root document.
            </p>
            <div className="help-content border rounded p-3 bg-light">
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a href={href ?? '#'} className="text-primary">
                      {children}
                    </a>
                  ),
                  pre: ({ children }) => <pre className="help-pre mb-0">{children}</pre>,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
            {error && (
              <div className="alert alert-danger mt-3 mb-0 py-2" role="alert">
                {error}
                {subscribeHint && (
                  <div className="mt-2">
                    <Link href="/subscription" className="alert-link">
                      View subscription options
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating…' : 'Create document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
