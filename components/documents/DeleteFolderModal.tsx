'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteFolderModalProps {
  folderId: string;
  folderName: string;
  hasContents: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ModalStep = 'confirm-contents' | 'confirm-delete' | 'confirm-name' | 'deleting' | 'error';

export default function DeleteFolderModal({
  folderId,
  folderName,
  hasContents,
  onClose,
  onSuccess,
}: DeleteFolderModalProps) {
  const [step, setStep] = useState<ModalStep>(hasContents ? 'confirm-contents' : 'confirm-delete');
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDeleteContents = async () => {
    setStep('confirm-delete');
  };

  const handleConfirmDelete = () => {
    setStep('confirm-name');
    setNameInput('');
    setError('');
  };

  const handleDeleteFolder = async () => {
    if (nameInput !== folderName) {
      setError(`Name doesn't match. Please type "${folderName}" to confirm.`);
      return;
    }

    setStep('deleting');
    setError('');

    try {
      const res = await fetch(`/api/documents/folders/${folderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete folder');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/documents');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
      setStep('error');
    }
  };

  if (!['confirm-contents', 'confirm-delete', 'confirm-name', 'deleting', 'error'].includes(step)) {
    return null;
  }

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          {step === 'confirm-contents' && (
            <>
              <div className="modal-header">
                <h5 className="modal-title">Delete Folder</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  This folder contains files and subfolders. Do you want to delete all contents as well?
                </p>
                <div className="alert alert-warning small mb-0">
                  <i className="bx bx-exclamation-circle me-2"></i>
                  This action cannot be undone.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteContents}
                >
                  Yes, Delete Everything
                </button>
              </div>
            </>
          )}

          {step === 'confirm-delete' && (
            <>
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Are you sure you want to delete the folder <strong>"{folderName}"</strong>
                  {hasContents && ' and all its contents'}?
                </p>
                <div className="alert alert-danger small mb-0">
                  <i className="bx bx-error-circle me-2"></i>
                  This action cannot be undone.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmDelete}
                >
                  Ok, Continue
                </button>
              </div>
            </>
          )}

          {step === 'confirm-name' && (
            <>
              <div className="modal-header">
                <h5 className="modal-title">Final Confirmation</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Type the folder name to confirm deletion:
                </p>
                <p className="mb-3 text-muted small">
                  <strong>Folder name:</strong> {folderName}
                </p>
                <input
                  type="text"
                  className={`form-control${error ? ' is-invalid' : ''}`}
                  placeholder="Type folder name"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nameInput === folderName) {
                      handleDeleteFolder();
                    }
                  }}
                />
                {error && <div className="invalid-feedback d-block small mt-2">{error}</div>}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteFolder}
                  disabled={nameInput !== folderName}
                >
                  Delete Folder
                </button>
              </div>
            </>
          )}

          {step === 'deleting' && (
            <>
              <div className="modal-header">
                <h5 className="modal-title">Deleting...</h5>
              </div>
              <div className="modal-body">
                <div className="d-flex align-items-center">
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Deleting...</span>
                  </div>
                  <span className="text-muted">Deleting folder...</span>
                </div>
              </div>
            </>
          )}

          {step === 'error' && (
            <>
              <div className="modal-header">
                <h5 className="modal-title">Error</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger mb-0">
                  <i className="bx bx-error-circle me-2"></i>
                  {error}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep('confirm-delete')}
                >
                  Try Again
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
