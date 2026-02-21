'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteListButtonProps {
  listId: string;
  listTitle: string;
  onDeleteSuccess?: () => void;
  /** When true, shows "Delete" label next to the icon (for use on list detail page) */
  showLabel?: boolean;
}

export default function DeleteListButton({ listId, listTitle, onDeleteSuccess, showLabel }: DeleteListButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'confirm' | 'verify'>('confirm');
  const [listNameInput, setListNameInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleOpenModal = () => {
    setShowModal(true);
    setStep('confirm');
    setListNameInput('');
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setStep('confirm');
    setListNameInput('');
    setError('');
  };

  const handleConfirm = () => {
    setStep('verify');
    setError('');
  };

  const handleDelete = async () => {
    if (listNameInput.trim() !== listTitle.trim()) {
      setError('List name does not match. Please enter the exact list name.');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete list');
      }

      // Close modal and refresh page
      handleCloseModal();
      router.refresh();
      // Call optional callback to refresh parent component
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete list');
      setIsDeleting(false);
    }
  };

  // Handle Escape key to close modal and prevent body scroll
  useEffect(() => {
    if (!showModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        setShowModal(false);
        setStep('confirm');
        setListNameInput('');
        setError('');
      }
    };

    // Prevent body scroll when modal is open
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
        className={`btn btn-outline-danger ${showLabel ? '' : 'btn-sm'}`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleOpenModal();
        }}
        title="Delete"
      >
        <i className="bx bx-trash"></i>
        {showLabel && <span className="ms-1">Delete</span>}
      </button>

      {showModal && (
        <div
          className="modal fade show"
          style={{ display: 'block' }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="deleteListModalLabel"
          aria-hidden="false"
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="deleteListModalLabel">
                  Delete List
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  aria-label="Close"
                  disabled={isDeleting}
                ></button>
              </div>
              <div className="modal-body">
                {step === 'confirm' ? (
                  <>
                    <p className="mb-3">
                      Are you sure you want to delete <strong>{listTitle}</strong>?
                    </p>
                    <p className="text-danger mb-0">
                      <strong>Warning:</strong> This action cannot be undone. All list data, properties, and rows will be permanently deleted.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mb-3">
                      To confirm deletion, please enter the list name:
                    </p>
                    <p className="mb-3">
                      <strong>{listTitle}</strong>
                    </p>
                    <div className="mb-3">
                      <label htmlFor="listNameInput" className="form-label">
                        List Name
                      </label>
                      <input
                        id="listNameInput"
                        type="text"
                        className={`form-control ${error ? 'is-invalid' : ''}`}
                        value={listNameInput}
                        onChange={(e) => {
                          setListNameInput(e.target.value);
                          setError('');
                        }}
                        placeholder="Enter list name"
                        disabled={isDeleting}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && listNameInput.trim() === listTitle.trim()) {
                            handleDelete();
                          }
                        }}
                      />
                      {error && (
                        <div className="invalid-feedback d-block">{error}</div>
                      )}
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
                    onClick={handleDelete}
                    disabled={isDeleting || listNameInput.trim() !== listTitle.trim()}
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
        <div
          className="modal-backdrop fade show"
          onClick={handleCloseModal}
        ></div>
      )}
    </>
  );
}
