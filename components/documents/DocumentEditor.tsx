'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useDocumentsTreeRefresh } from '@/components/documents/DocumentsTreeContext';
import DeleteDocumentButton from '@/components/documents/DeleteDocumentButton';
import '@uiw/react-md-editor/markdown-editor.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

const DEBOUNCE_MS = 800;
const MAX_WAIT_MS = 8000;
const SAVED_STATUS_MS = 2000;

interface DocumentEditorProps {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  initialIsPublic: boolean;
  initialRelativePath: string;
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

  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [titleError, setTitleError] = useState('');

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
    <div className="card">
      <div className="card-body">
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
        <div className="documents-markdown-editor" data-color-mode={colorMode}>
          <MDEditor
            value={content}
            onChange={onContentChange}
            onPaste={handleImagePaste}
            height={400}
            preview="live"
          />
        </div>
      </div>
    </div>
  );
}
