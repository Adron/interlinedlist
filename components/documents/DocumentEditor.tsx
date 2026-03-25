'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
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
}: DocumentEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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
    async (options?: { keepalive?: boolean }) => {
      const snapshot = {
        title: titleRef.current,
        content: contentRef.current,
        isPublic: isPublicRef.current,
      };

      if (snapshotsEqual(snapshot, lastSavedRef.current)) {
        return;
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
          return;
        }

        if (res.ok) {
          lastSavedRef.current = { ...snapshot };
          clearAllTimers();
          setSaveStatus('saved');
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
        } else {
          setSaveStatus('error');
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }
        if (gen !== saveGenRef.current) {
          return;
        }
        setSaveStatus('error');
      } finally {
        if (gen === saveGenRef.current) {
          setSaving(false);
        }
      }
    },
    [documentId, clearAllTimers]
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

  const onTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    titleRef.current = v;
    setTitle(v);
    scheduleAutosave();
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

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <input
            type="text"
            className="form-control form-control-lg border-0 bg-transparent"
            value={title}
            onChange={onTitleChange}
            placeholder="Document title"
            style={{ maxWidth: '60%' }}
          />
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
        <div data-color-mode="light">
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
