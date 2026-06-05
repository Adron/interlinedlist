'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

interface MoveDocumentModalProps {
  show: boolean;
  documentId: string;
  currentFolderId: string | null;
  onClose: () => void;
  onMoveSuccess: (newFolderId: string | null) => void;
}

export default function MoveDocumentModal({
  show,
  documentId,
  currentFolderId,
  onClose,
  onMoveSuccess,
}: MoveDocumentModalProps) {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [createFolderError, setCreateFolderError] = useState('');

  const fetchFolders = useCallback(async () => {
    setLoadingFolders(true);
    setFetchError('');
    try {
      const res = await fetch('/api/documents/folders');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load folders');
      }
      const data: { folders: Folder[] } = await res.json();
      setFolders(data.folders);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  useEffect(() => {
    if (show) {
      setSelectedFolderId(currentFolderId);
      setMoveError('');
      setNewFolderName('');
      setCreateFolderError('');
      void fetchFolders();
    }
  }, [show, currentFolderId, fetchFolders]);

  useEffect(() => {
    if (!show) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isMoving) {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [show, isMoving, onClose]);

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setCreateFolderError('Folder name cannot be empty.');
      return;
    }
    setIsCreatingFolder(true);
    setCreateFolderError('');
    try {
      const res = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, parentId: selectedFolderId ?? null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create folder');
      }
      const data: { folder: Folder } = await res.json();
      await fetchFolders();
      setSelectedFolderId(data.folder.id);
      setNewFolderName('');
    } catch (err: unknown) {
      setCreateFolderError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleMove = async () => {
    setIsMoving(true);
    setMoveError('');
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: selectedFolderId ?? null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to move document');
      }
      onMoveSuccess(selectedFolderId ?? null);
      router.refresh();
    } catch (err: unknown) {
      setMoveError(err instanceof Error ? err.message : 'Failed to move document');
      setIsMoving(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block' }}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="moveDocumentModalLabel"
        aria-hidden="false"
      >
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="moveDocumentModalLabel">
                Move Document
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
                disabled={isMoving}
              />
            </div>
            <div className="modal-body">
              {loadingFolders ? (
                <div className="d-flex align-items-center gap-2">
                  <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Loading folders…</span>
                </div>
              ) : fetchError ? (
                <div className="alert alert-danger mb-0">{fetchError}</div>
              ) : (
                <>
                  <p className="mb-2">Select a destination folder:</p>
                  <div
                    className="border rounded p-2 mb-3"
                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                  >
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="folderSelect"
                        id="folder-root"
                        value=""
                        checked={selectedFolderId === null}
                        onChange={() => setSelectedFolderId(null)}
                        disabled={isMoving}
                      />
                      <label className="form-check-label" htmlFor="folder-root">
                        Root (no folder)
                      </label>
                    </div>
                    {folders.map((folder) => (
                      <div className="form-check" key={folder.id}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="folderSelect"
                          id={`folder-${folder.id}`}
                          value={folder.id}
                          checked={selectedFolderId === folder.id}
                          onChange={() => setSelectedFolderId(folder.id)}
                          disabled={isMoving}
                        />
                        <label className="form-check-label" htmlFor={`folder-${folder.id}`}>
                          {folder.name}
                        </label>
                      </div>
                    ))}
                  </div>

                  <details>
                    <summary className="text-muted small" style={{ cursor: 'pointer' }}>
                      Create new folder
                    </summary>
                    <div className="mt-2 d-flex gap-2 align-items-start">
                      <div className="flex-grow-1">
                        <input
                          type="text"
                          className={`form-control form-control-sm ${createFolderError ? 'is-invalid' : ''}`}
                          placeholder="Folder name"
                          value={newFolderName}
                          onChange={(e) => {
                            setNewFolderName(e.target.value);
                            setCreateFolderError('');
                          }}
                          disabled={isCreatingFolder || isMoving}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleCreateFolder();
                          }}
                        />
                        {createFolderError && (
                          <div className="invalid-feedback d-block">{createFolderError}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => void handleCreateFolder()}
                        disabled={isCreatingFolder || isMoving || !newFolderName.trim()}
                      >
                        {isCreatingFolder ? 'Creating…' : 'Create'}
                      </button>
                    </div>
                  </details>

                  {moveError && (
                    <div className="alert alert-danger mt-3 mb-0">{moveError}</div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isMoving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleMove()}
                disabled={isMoving || loadingFolders || !!fetchError}
              >
                {isMoving ? 'Moving…' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        className="modal-backdrop fade show"
        onClick={!isMoving ? onClose : undefined}
        aria-hidden="true"
      />
    </>
  );
}
