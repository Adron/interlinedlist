'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface DocumentEditorProps {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  initialIsPublic: boolean;
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

  const save = useCallback(async () => {
    setSaving(true);
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, isPublic }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [documentId, title, content, isPublic]);

  useEffect(() => {
    if (content === initialContent && title === initialTitle) return;
    const t = setTimeout(save, 2000);
    return () => clearTimeout(t);
  }, [content, title, save]);

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
          setContent((prev) => prev + img);
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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            style={{ maxWidth: '60%' }}
          />
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && 'Error saving'}
            </span>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="isPublic">
                Public
              </label>
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={save}
              disabled={saving}
            >
              Save
            </button>
          </div>
        </div>
        <div data-color-mode="light">
          <MDEditor
            value={content}
            onChange={(v) => setContent(v ?? '')}
            onPaste={handleImagePaste}
            height={400}
            preview="live"
          />
        </div>
      </div>
    </div>
  );
}
