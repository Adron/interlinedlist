'use client';

import { useState, useEffect, useRef } from 'react';

interface RenameFolderInputProps {
  folderId: string;
  initialName: string;
  onSave: (newName: string) => Promise<void>;
  onCancel: () => void;
}

export default function RenameFolderInput({
  folderId,
  initialName,
  onSave,
  onCancel,
}: RenameFolderInputProps) {
  const [value, setValue] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
    if (committingRef.current) return;

    const trimmed = value.trim();

    if (trimmed === initialName) {
      onCancel();
      return;
    }

    if (!trimmed) {
      setError('Name cannot be empty');
      return;
    }

    committingRef.current = true;
    setSaving(true);
    setError('');

    try {
      await onSave(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename folder');
      setSaving(false);
      committingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        className={`form-control form-control-sm${error ? ' is-invalid' : ''}`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError('');
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        disabled={saving}
        style={{ maxWidth: '160px' }}
      />
      {error && <div className="invalid-feedback d-block small">{error}</div>}
    </div>
  );
}
