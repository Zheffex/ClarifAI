import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import './DeleteConfirmationModal.css';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  datasetName: string;
  isDeleting?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  datasetName,
  isDeleting = false
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  const modalContent = (
    <div className="delete-modal-overlay" onClick={handleBackdropClick}>
      <div className="delete-modal">
        <div className="delete-modal__header">
          <div className="delete-modal__icon">
            <AlertTriangle className="warning-icon" />
          </div>
          <button 
            className="delete-modal__close"
            onClick={onClose}
            disabled={isDeleting}
          >
            <X className="close-icon" />
          </button>
        </div>

        <div className="delete-modal__content">
          <h3 className="delete-modal__title">Delete Dataset</h3>
          <p className="delete-modal__message">
            Are you sure you want to delete <strong>"{datasetName}"</strong>?
          </p>
          <div className="delete-modal__warning">
            <AlertTriangle className="warning-icon-small" />
            <span>This action cannot be undone</span>
          </div>
        </div>

        <div className="delete-modal__actions">
          <button
            className="delete-modal__btn delete-modal__btn--cancel"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="delete-modal__btn delete-modal__btn--delete"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="loading-spinner-small"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="btn-icon" />
                Delete Dataset
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DeleteConfirmationModal;
