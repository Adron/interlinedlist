'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ParsedField } from '@/lib/lists/dsl-types';
import { buildListMarkdown, buildListDocumentPaths } from '@/lib/lists/row-to-markdown';

const MAX_ROWS = 500;

interface CreateDocFromListModalProps {
  open: boolean;
  onClose: () => void;
  listId: string;
  listTitle: string;
  fields: ParsedField[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export default function CreateDocFromListModal({
  open,
  onClose,
  listId,
  listTitle,
  fields,
  rows,
  totalRows,
}: CreateDocFromListModalProps) {
  const router = useRouter();
  const [listStyle, setListStyle] = useState<'numbered' | 'bulleted'>('numbered');
  const [rowDataStyle, setRowDataStyle] = useState<'inline' | 'sub-items'>('inline');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setLoading(false);
    }
  }, [open]);

  const truncated = rows.length < totalRows;

  const markdown = useMemo(
    () =>
      buildListMarkdown({
        listTitle,
        fields,
        rows,
        listStyle,
        rowDataStyle,
        truncated,
        totalRows,
      }),
    [listTitle, fields, rows, listStyle, rowDataStyle, truncated, totalRows]
  );

  const { title, relativePath } = useMemo(
    () => buildListDocumentPaths(listTitle, listId),
    [listTitle, listId]
  );

  if (!open) return null;

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: markdown, relativePath }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.document?.id) {
        onClose();
        router.push(`/documents/${data.document.id}`);
        return;
      }
      setError(typeof data.error === 'string' ? data.error : 'Failed to create document');
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
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="createDocFromListTitle"
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="createDocFromListTitle">
              Export list to document
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={loading}
            />
          </div>

          <div className="modal-body">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <p className="fw-semibold mb-2">List style</p>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="listStyle"
                    id="listStyleNumbered"
                    checked={listStyle === 'numbered'}
                    onChange={() => setListStyle('numbered')}
                  />
                  <label className="form-check-label" htmlFor="listStyleNumbered">
                    Numbered (1. 2. 3.)
                  </label>
                </div>
                <div className="form-check mb-4">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="listStyle"
                    id="listStyleBulleted"
                    checked={listStyle === 'bulleted'}
                    onChange={() => setListStyle('bulleted')}
                  />
                  <label className="form-check-label" htmlFor="listStyleBulleted">
                    Bulleted (-)
                  </label>
                </div>

                <p className="fw-semibold mb-2">Row data style</p>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="rowDataStyle"
                    id="rowDataStyleInline"
                    checked={rowDataStyle === 'inline'}
                    onChange={() => setRowDataStyle('inline')}
                  />
                  <label className="form-check-label" htmlFor="rowDataStyleInline">
                    Inline (comma-delimited)
                  </label>
                </div>
                <div className="form-check mb-4">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="rowDataStyle"
                    id="rowDataStyleSubItems"
                    checked={rowDataStyle === 'sub-items'}
                    onChange={() => setRowDataStyle('sub-items')}
                  />
                  <label className="form-check-label" htmlFor="rowDataStyleSubItems">
                    Sub-items (key: value)
                  </label>
                </div>

                <p className="text-muted small mb-0">
                  {rows.length} row{rows.length !== 1 ? 's' : ''}
                  {truncated && (
                    <span className="d-block mt-1 text-warning-emphasis">
                      Capped at {MAX_ROWS} of {totalRows} total rows.
                    </span>
                  )}
                </p>
              </div>

              <div className="col-12 col-md-8">
                <p className="fw-semibold mb-2">Preview</p>
                <div
                  className="help-content border rounded p-3 bg-light"
                  style={{ maxHeight: 'min(55vh, 440px)', overflowY: 'auto' }}
                >
                  <ReactMarkdown
                    components={{
                      a: ({ href, children }) => (
                        <a href={href ?? '#'} className="text-primary">
                          {children}
                        </a>
                      ),
                      pre: ({ children }) => (
                        <pre className="help-pre mb-0">{children}</pre>
                      ),
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              </div>
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
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
