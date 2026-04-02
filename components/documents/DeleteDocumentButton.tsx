'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteDocumentButtonProps {
  documentId: string;
  /** Exact string the user must type in step 2 (e.g. saved title.trim() || relativePath). */
  displayName: string;
  onDeleteSuccess?: () => void;
}

export default function DeleteDocumentButton({
  documentId,
  displayName,
  onDeleteSuccess,
}: DeleteDocumentButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'confirm' | 'verify'>('confirm');
  const [nameInput, setNameInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleOpenModal = () => {
    setShowModal(true);
    setStep('confirm');
    setNameInput('');
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setStep('confirm');
    setNameInput('');
    setError('');
  };

  const handleConfirm = () => {
    setStep('verify');
    setError('');
  };

  const handleDelete = async () => {
    if (nameInput.trim() !== displayName.trim()) {
      setError('Document name does not match. Please enter the exact name.');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }

      handleCloseModal();
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
      router.push('/documents');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!showModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        setShowModal(false);
        setStep('confirm');
        setNameInput('');
        setError('');
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showModal, isDeleting]);

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-danger btn-sm"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleOpenModal();
        }}
      >
        Delete
      </button>

      {showModal && (
        <div
          className="modal fade show"
          style={{ display: 'block' }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="deleteDocumentModalLabel"
          aria-hidden="false"
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="deleteDocumentModalLabel">
                  Delete Document
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  aria-label="Close"
                  disabled={isDeleting}
                />
              </div>
              <div className="modal-body">
                {step === 'confirm' ? (
                  <>
                    <p className="mb-3">
                      Are you sure you want to delete <strong>{displayName}</strong>?
                    </p>
                    <p className="text-danger mb-0">
                      <strong>Warning:</strong> This action cannot be undone. The document and any
                      embedded images stored for it will be permanently removed.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mb-3">To confirm deletion, please enter the document name:</p>
                    <p className="mb-3">
                      <strong>{displayName}</strong>
                    </p>
                    <div className="mb-3">
                      <label htmlFor="documentDeleteNameInput" className="form-label">
                        Document name
                      </label>
                      <input
                        id="documentDeleteNameInput"
                        type="text"
                        className={`form-control ${error ? 'is-invalid' : ''}`}
                        value={nameInput}
                        onChange={(e) => {
                          setNameInput(e.target.value);
                          setError('');
                        }}
                        placeholder="Enter document name"
                        disabled={isDeleting}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && nameInput.trim() === displayName.trim()) {
                            void handleDelete();
                          }
                        }}
                      />
                      {error && <div className="invalid-feedback d-block">{error}</div>}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                {step === 'confirm' ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirm}
                    disabled={isDeleting}
                  >
                    Confirm
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void handleDelete()}
                    disabled={isDeleting || nameInput.trim() !== displayName.trim()}
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal-backdrop fade show" onClick={handleCloseModal} aria-hidden="true" />
      )}
    </>
  );
}
