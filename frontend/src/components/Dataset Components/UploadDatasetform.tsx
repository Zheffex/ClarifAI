// src/components/UploadDatasetFormModal.tsx
import React, { useState } from 'react';
import { useDataset } from '../../contexts/DatasetContext';
import './DatasetComponent.css';

export const UploadDatasetFormModal: React.FC = () => {
  const { uploadDataset, isLoading } = useDataset();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return alert('File and name are required');
    await uploadDataset(file, name, description);
    setFile(null);
    setName('');
    setDescription('');
    setIsOpen(false); // close modal after upload
  };

  return (
    <div>
      {/* Trigger Button */}
      <button
        className="open-modal-btn"
        onClick={() => setIsOpen(true)}
      >
        Upload Dataset
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          {/* Modal Content */}
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Upload Dataset</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Dataset Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter a name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Enter a short description"
                />
              </div>
              <div className="form-group">
                <label>File</label>
                <input
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
