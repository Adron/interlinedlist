'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useDocumentsTreeRefresh } from '@/components/documents/DocumentsTreeContext';
import DeleteDocumentButton from '@/components/documents/DeleteDocumentButton';
import MoveDocumentModal from '@/components/documents/MoveDocumentModal';
import '@uiw/react-md-editor/markdown-editor.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

const DEBOUNCE_MS = 800;
const MAX_WAIT_MS = 8000;
const SAVED_STATUS_MS = 2000;
const EDITOR_MIN_HEIGHT = 240;
const EDITOR_VIEWPORT_BOTTOM_PAD = 16;

interface DocumentEditorProps {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  initialIsPublic: boolean;
  initialRelativePath: string;
  initialFolderId?: string | null;
}

function snapshotsEqual(
  a: { title: string; content: string; isPublic: boolean },
  b: { title: string; content: string; isPublic: boolean }
) {
  return a.title === b.title && a.content === b.content && a.isPublic === b.isPublic;
}

export default function DocumentEditor({
  documentId,
  initialTitle,
  initialContent,
  initialIsPublic,
  initialRelativePath,
  initialFolderId = null,
}: DocumentEditorProps) {
  const router = useRouter();
  const { requestTreeRefresh } = useDocumentsTreeRefresh();
  const [title, setTitle] = useState(initialTitle);
  const [committedTitle, setCommittedTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);

  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'live'>('live');
  const [editorHeight, setEditorHeight] = useState(400);

  const cardBodyRef = useRef<HTMLDivElement>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const measureEditorRafRef = useRef<number | null>(null);

  const titleRef = useRef(initialTitle);
  const contentRef = useRef(initialContent);
  const isPublicRef = useRef(initialIsPublic);
  const lastSavedRef = useRef({
    title: initialTitle,
    content: initialContent,
    isPublic: initialIsPublic,
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkpointTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const saveGenRef = useRef(0);

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const clearCheckpointTimer = useCallback(() => {
    if (checkpointTimerRef.current) {
      clearTimeout(checkpointTimerRef.current);
      checkpointTimerRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearDebounceTimer();
    clearCheckpointTimer();
  }, [clearDebounceTimer, clearCheckpointTimer]);

  const flushSave = useCallback(
    async (options?: { keepalive?: boolean }): Promise<boolean> => {
      const snapshot = {
        title: titleRef.current,
        content: contentRef.current,
        isPublic: isPublicRef.current,
      };

      if (snapshotsEqual(snapshot, lastSavedRef.current)) {
        return true;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const gen = ++saveGenRef.current;

      setSaving(true);
      setSaveStatus('saving');

      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: snapshot.title,
            content: snapshot.content,
            isPublic: snapshot.isPublic,
          }),
          signal: ac.signal,
          keepalive: options?.keepalive === true,
        });

        if (gen !== saveGenRef.current) {
          return false;
        }

        if (res.ok) {
          lastSavedRef.current = { ...snapshot };
          setCommittedTitle(titleRef.current);
          clearAllTimers();
          setSaveStatus('saved');
          requestTreeRefresh();
          router.refresh();
          window.setTimeout(() => {
            setSaveStatus((s) => (s === 'saved' ? 'idle' : s));
          }, SAVED_STATUS_MS);

          const cur = {
            title: titleRef.current,
            content: contentRef.current,
            isPublic: isPublicRef.current,
          };
          if (!snapshotsEqual(cur, lastSavedRef.current)) {
            debounceTimerRef.current = setTimeout(() => {
              debounceTimerRef.current = null;
              void flushSave();
            }, DEBOUNCE_MS);
            if (checkpointTimerRef.current === null) {
              checkpointTimerRef.current = setTimeout(() => {
                checkpointTimerRef.current = null;
                void flushSave();
              }, MAX_WAIT_MS);
            }
          }
          return true;
        }
        setSaveStatus('error');
        return false;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return false;
        }
        if (gen !== saveGenRef.current) {
          return false;
        }
        setSaveStatus('error');
        return false;
      } finally {
        if (gen === saveGenRef.current) {
          setSaving(false);
        }
      }
    },
    [documentId, clearAllTimers, requestTreeRefresh, router]
  );

  const scheduleAutosave = useCallback(() => {
    const snapshot = {
      title: titleRef.current,
      content: contentRef.current,
      isPublic: isPublicRef.current,
    };

    if (snapshotsEqual(snapshot, lastSavedRef.current)) {
      clearAllTimers();
      return;
    }

    clearDebounceTimer();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void flushSave();
    }, DEBOUNCE_MS);

    if (checkpointTimerRef.current === null) {
      checkpointTimerRef.current = setTimeout(() => {
        checkpointTimerRef.current = null;
        void flushSave();
      }, MAX_WAIT_MS);
    }
  }, [clearDebounceTimer, clearAllTimers, flushSave]);

  useEffect(() => {
    const rsc = {
      title: initialTitle,
      content: initialContent,
      isPublic: initialIsPublic,
    };
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (!res.ok || cancelled) return;
        const data: { document?: { title: string; content: string; isPublic: boolean } } =
          await res.json();
        if (cancelled || !data.document) return;
        const d = data.document;

        if (
          titleRef.current === rsc.title &&
          contentRef.current === rsc.content &&
          isPublicRef.current === rsc.isPublic &&
          lastSavedRef.current.title === rsc.title &&
          lastSavedRef.current.content === rsc.content &&
          lastSavedRef.current.isPublic === rsc.isPublic
        ) {
          setTitle(d.title);
          setCommittedTitle(d.title);
          setContent(d.content);
          setIsPublic(d.isPublic);
          titleRef.current = d.title;
          contentRef.current = d.content;
          isPublicRef.current = d.isPublic;
          lastSavedRef.current = { title: d.title, content: d.content, isPublic: d.isPublic };
        }
      } catch {
        /* ignore refresh errors; RSC payload remains */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentId, initialTitle, initialContent, initialIsPublic]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void flushSave({ keepalive: true });
      }
    };
    const onPageHide = () => {
      void flushSave({ keepalive: true });
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flushSave]);

  useEffect(() => {
    return () => {
      clearAllTimers();
      abortRef.current?.abort();
    };
  }, [clearAllTimers]);

  useEffect(() => {
    const root = document.documentElement;

    const syncTheme = () => {
      const theme = root.getAttribute('data-theme');
      setColorMode(theme === 'dark' ? 'dark' : 'light');
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  const scheduleMeasureEditorHeight = useCallback(() => {
    if (measureEditorRafRef.current != null) return;
    measureEditorRafRef.current = window.requestAnimationFrame(() => {
      measureEditorRafRef.current = null;
      const shell = editorShellRef.current;
      if (!shell) return;
      const vv = window.visualViewport;
      const vh = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const rect = shell.getBoundingClientRect();
      const top = Math.max(0, rect.top - offsetTop);
      const next = Math.floor(vh - top - EDITOR_VIEWPORT_BOTTOM_PAD);
      setEditorHeight(Math.max(EDITOR_MIN_HEIGHT, next));
    });
  }, []);

  useLayoutEffect(() => {
    scheduleMeasureEditorHeight();
    const roTarget = cardBodyRef.current;
    const ro = new ResizeObserver(() => scheduleMeasureEditorHeight());
    if (roTarget) ro.observe(roTarget);

    window.addEventListener('resize', scheduleMeasureEditorHeight);
    window.addEventListener('scroll', scheduleMeasureEditorHeight, true);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', scheduleMeasureEditorHeight);
    vv?.addEventListener('scroll', scheduleMeasureEditorHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', scheduleMeasureEditorHeight);
      window.removeEventListener('scroll', scheduleMeasureEditorHeight, true);
      vv?.removeEventListener('resize', scheduleMeasureEditorHeight);
      vv?.removeEventListener('scroll', scheduleMeasureEditorHeight);
      if (measureEditorRafRef.current != null) {
        cancelAnimationFrame(measureEditorRafRef.current);
        measureEditorRafRef.current = null;
      }
    };
  }, [isTitleEditing, editorMode, scheduleMeasureEditorHeight]);

  const beginTitleEdit = () => {
    setDraftTitle(title);
    setTitleError('');
    setIsTitleEditing(true);
  };

  const cancelTitleEdit = () => {
    setTitleError('');
    setIsTitleEditing(false);
  };

  const saveTitleEdit = async () => {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      setTitleError('Title cannot be empty.');
      return;
    }
    setTitleError('');
    titleRef.current = trimmed;
    setTitle(trimmed);

    const ok = await flushSave();
    if (ok) {
      setIsTitleEditing(false);
    } else {
      setTitleError('Could not save title. Try again.');
    }
  };

  const onContentChange = (v: string | undefined) => {
    const val = v ?? '';
    contentRef.current = val;
    setContent(val);
    scheduleAutosave();
  };

  const onPublicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.checked;
    isPublicRef.current = v;
    setIsPublic(v);
    scheduleAutosave();
  };

  const handleRetry = () => {
    void flushSave();
  };

  const handlePrint = () => {
    // Ensure preview is visible before printing
    if (editorMode !== 'live' && editorMode !== 'preview') {
      setEditorMode('live');
      // Wait for state to update before printing
      setTimeout(() => {
        window.print();
      }, 100);
    } else {
      window.print();
    }
  };

  const handleImagePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/documents/${documentId}/images/upload`, {
          method: 'POST',
          body: fd,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          const img = `![image](${data.url})`;
          setContent((prev) => {
            const next = prev + img;
            contentRef.current = next;
            return next;
          });
          scheduleAutosave();
        }
        return;
      }
    }
  };

  const titleDisplay = title.trim() || initialRelativePath;

  return (
    <>
      <style>{`
        @media print {
          .app-topbar,
          .sidebar,
          .documents-markdown-editor .w-md-editor-toolbar,
          .documents-markdown-editor .w-md-editor .w-md-editor-bar,
          button[onclick*="print"],
          .btn-outline-secondary,
          .form-check,
          .btn-link {
            display: none !important;
          }

          .documents-markdown-editor .w-md-editor {
            border: none !important;
            background: white !important;
            color: black !important;
          }

          .documents-markdown-editor .w-md-editor-preview {
            width: 100% !important;
            padding: 0 !important;
          }

          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .card-body {
            padding: 0 !important;
          }

          h1 {
            page-break-after: avoid;
          }

          h2, h3, h4, h5, h6 {
            page-break-after: avoid;
          }

          p {
            orphans: 3;
            widows: 3;
          }

          body {
            font-family: Georgia, serif;
            font-size: 12pt;
            line-height: 1.5;
          }
        }
      `}</style>
      <div className="card">
      <div className="card-body" ref={cardBodyRef}>
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0 flex-wrap">
            {isTitleEditing ? (
              <div className="d-flex flex-wrap align-items-start gap-2 flex-grow-1">
                <div style={{ minWidth: '12rem', maxWidth: 'min(100%, 24rem)', flex: '1 1 12rem' }}>
                  <input
                    type="text"
                    className={`form-control form-control-lg ${titleError ? 'is-invalid' : ''}`}
                    value={draftTitle}
                    onChange={(e) => {
                      setDraftTitle(e.target.value);
                      setTitleError('');
                    }}
                    placeholder="Document title"
                    autoFocus
                    aria-invalid={!!titleError}
                    aria-describedby={titleError ? 'document-title-error' : undefined}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelTitleEdit();
                      if (e.key === 'Enter') void saveTitleEdit();
                    }}
                  />
                  {titleError && (
                    <div id="document-title-error" className="invalid-feedback d-block">
                      {titleError}
                    </div>
                  )}
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void saveTitleEdit()}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={cancelTitleEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="h4 mb-0 text-start btn btn-link text-decoration-none text-body p-0 text-truncate"
                  style={{ maxWidth: 'min(100%, 28rem)' }}
                  onClick={beginTitleEdit}
                  title="Edit title"
                >
                  {titleDisplay}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={beginTitleEdit}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowMoveModal(true)}
                >
                  Move
                </button>
                <MoveDocumentModal
                  show={showMoveModal}
                  documentId={documentId}
                  currentFolderId={currentFolderId}
                  onClose={() => setShowMoveModal(false)}
                  onMoveSuccess={(newFolderId) => {
                    setCurrentFolderId(newFolderId);
                    setShowMoveModal(false);
                    requestTreeRefresh();
                    router.refresh();
                  }}
                />
                <DeleteDocumentButton
                  documentId={documentId}
                  displayName={committedTitle.trim() || initialRelativePath}
                  onDeleteSuccess={requestTreeRefresh}
                />
              </>
            )}
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
            <span className="small text-muted">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && (
                <>
                  Couldn&apos;t save
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ms-1 align-baseline"
                    onClick={handleRetry}
                    disabled={saving}
                  >
                    Retry
                  </button>
                </>
              )}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handlePrint}
              title="Print document"
            >
              <i className="bx bx-printer"></i> Print
            </button>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={onPublicChange}
              />
              <label className="form-check-label small" htmlFor="isPublic">
                Public
              </label>
            </div>
          </div>
        </div>
        <div
          className="documents-markdown-editor"
          data-color-mode={colorMode}
          ref={editorShellRef}
          style={{ minHeight: editorHeight }}
        >
          <MDEditor
            value={content}
            onChange={onContentChange}
            onPaste={handleImagePaste}
            height={editorHeight}
            preview={editorMode as 'edit' | 'preview' | 'live'}
          />
        </div>
      </div>
    </div>
    </>
  );
}
