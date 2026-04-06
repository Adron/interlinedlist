'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDocumentsTreeRefresh } from '@/components/documents/DocumentsTreeContext';

interface TemplateItem {
  id: string;
  title: string;
  relativePath: string;
}

interface NewFromTemplateButtonProps {
  /** null = create at document root */
  targetFolderId: string | null;
}

type ModalPhase = 'loading' | 'seedPrompt' | 'list' | 'empty';

export default function NewFromTemplateButton({
  targetFolderId,
}: NewFromTemplateButtonProps) {
  const router = useRouter();
  const { requestTreeRefresh } = useDocumentsTreeRefresh();
  const [showModal, setShowModal] = useState(false);
  const [phase, setPhase] = useState<ModalPhase>('loading');
  const [templatesFolderId, setTemplatesFolderId] = useState<string | null>(
    null
  );
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setPhase('loading');
    setTemplatesFolderId(null);
    setTemplates([]);
    setError('');
    setBusy(false);
  }, []);

  const loadTemplates = async () => {
    setError('');
    setPhase('loading');
    const res = await fetch('/api/documents/templates');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load templates');
      setPhase('empty');
      return;
    }
    const folderId: string = data.templatesFolderId;
    const list: TemplateItem[] = data.templates || [];
    const folderCreated: boolean = data.folderCreated === true;

    setTemplatesFolderId(folderId);
    setTemplates(list);

    if (folderCreated) {
      requestTreeRefresh();
    }

    if (folderCreated && list.length === 0) {
      setPhase('seedPrompt');
    } else if (list.length === 0) {
      setPhase('empty');
    } else {
      setPhase('list');
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setPhase('loading');
    setTemplatesFolderId(null);
    setTemplates([]);
    setError('');
    setBusy(false);
    void loadTemplates();
  };

  const handleDeclineSeed = () => {
    setPhase('empty');
  };

  const handleAcceptSeed = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/documents/templates/seed-defaults', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create default templates');
        setBusy(false);
        return;
      }
      setTemplatesFolderId(data.templatesFolderId ?? templatesFolderId);
      const list: TemplateItem[] = data.templates || [];
      setTemplates(list);
      setPhase(list.length === 0 ? 'empty' : 'list');
      requestTreeRefresh();
    } catch {
      setError('Failed to create default templates');
    } finally {
      setBusy(false);
    }
  };

  const handlePickTemplate = async (templateId: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/documents/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateDocumentId: templateId,
          targetFolderId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.document?.id) {
        setError(data.error || 'Failed to create document');
        setBusy(false);
        return;
      }
      handleCloseModal();
      requestTreeRefresh();
      router.push(`/documents/${data.document.id}`);
      router.refresh();
    } catch {
      setError('Failed to create document');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!showModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        handleCloseModal();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showModal, busy, handleCloseModal]);

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-primary"
        onClick={handleOpenModal}
      >
        <i className="bx bx-copy me-2"></i>
        New From Template
      </button>

      {showModal && (
        <div
          className="modal fade show"
          style={{ display: 'block' }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="newFromTemplateModalLabel"
          aria-hidden="false"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="newFromTemplateModalLabel">
                  New from template
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  aria-label="Close"
                  disabled={busy}
                />
              </div>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger py-2 mb-3">{error}</div>
                )}

                {phase === 'loading' && (
                  <p className="text-muted mb-0">Loading templates…</p>
                )}

                {phase === 'seedPrompt' && (
                  <div>
                    <p className="mb-3">
                      Create default templates? We&apos;ll add a{' '}
                      <strong>Recipe</strong> and{' '}
                      <strong>Social Media Campaign</strong> starter in your{' '}
                      <code className="small">_templates</code> folder.
                    </p>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void handleAcceptSeed()}
                        disabled={busy}
                      >
                        {busy ? 'Working…' : 'Yes, add defaults'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleDeclineSeed}
                        disabled={busy}
                      >
                        No thanks
                      </button>
                    </div>
                  </div>
                )}

                {phase === 'empty' && templatesFolderId && (
                  <div>
                    <p className="text-muted mb-3">
                      No templates yet. Add markdown files to the{' '}
                      <code className="small">_templates</code> folder, or open
                      it in the sidebar.
                    </p>
                    <Link
                      href={`/documents/folders/${templatesFolderId}`}
                      className="btn btn-outline-primary btn-sm"
                      onClick={handleCloseModal}
                    >
                      Open _templates folder
                    </Link>
                  </div>
                )}

                {phase === 'empty' && !templatesFolderId && (
                  <p className="text-muted mb-0">
                    No templates available.
                  </p>
                )}

                {phase === 'list' && (
                  <ul className="list-group list-group-flush">
                    {templates.map((t) => (
                      <li key={t.id} className="list-group-item px-0">
                        <button
                          type="button"
                          className="btn btn-link text-start text-decoration-none p-0 w-100"
                          onClick={() => void handlePickTemplate(t.id)}
                          disabled={busy}
                        >
                          <i className="bx bx-file me-2 text-muted"></i>
                          {t.title || t.relativePath}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleCloseModal}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="modal-backdrop fade show"
          onClick={busy ? undefined : handleCloseModal}
          aria-hidden="true"
        />
      )}
    </>
  );
}
