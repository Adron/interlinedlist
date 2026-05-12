'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Message } from '@/lib/types';
import { buildMessageMarkdown, buildMessageDocumentPaths } from '@/lib/messages/message-to-markdown';

interface MessageToDocButtonProps {
  message: Message;
  className?: string;
}

export default function MessageToDocButton({ message, className }: MessageToDocButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const { title, relativePath } = buildMessageDocumentPaths(message);
      const content = buildMessageMarkdown(message);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, relativePath }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.document?.id) {
        router.push(`/documents/${data.document.id}`);
        return;
      }
      const msg = typeof data.error === 'string' ? data.error : 'Failed to create document';
      setError(msg.toLowerCase().includes('subscri') ? 'Subscribers only' : 'Error saving');
    } catch {
      setError('Error saving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="position-relative d-inline-flex flex-column align-items-start">
      <button
        type="button"
        className={
          className ??
          'btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center px-2 py-1 shadow-sm'
        }
        onClick={handleCreate}
        disabled={loading}
        style={{ fontSize: '0.85rem', minWidth: '2.25rem', minHeight: '2.25rem' }}
        title="Save this message as a document"
        aria-label="Save message to documents"
      >
        {loading ? (
          <i className="bx bx-loader-alt bx-spin" aria-hidden />
        ) : (
          <i className="bx bx-file-blank" aria-hidden />
        )}
      </button>
      {error && (
        <span
          className="text-danger position-absolute"
          style={{ fontSize: '0.65rem', top: '100%', left: 0, whiteSpace: 'nowrap', zIndex: 10 }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
