import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useDataset } from '../../contexts/DatasetContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Dataset } from '../../types';
import './DatasetsPage.css';

// Dataset components
const DatasetCard: React.FC<{ 
  dataset: Dataset; 
  onDelete: (id: string) => void;
  onAnalyze: (dataset: Dataset) => void;
}> = ({ dataset, onDelete, onAnalyze }) => {
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${dataset.name}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete(dataset._id);
      } catch (error) {
        console.error('Delete failed:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return '#10b981';
      case 'processing': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    
    <div className="dataset-card" onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
      <div className="dataset-header">
        <div className="dataset-icon">📄</div>
        <div className="dataset-info">
          <h3 className="dataset-title">{dataset.name}</h3>
          <p className="dataset-description">{dataset.description || 'No description provided'}</p>
        </div>
        <div className={`dataset-status ${showActions ? 'hidden' : 'visible'}`}>
          <span 
            className="status-indicator"
            style={{ backgroundColor: getStatusColor(dataset.processingStatus) }}
          >
            {dataset.processingStatus}
          </span>
        </div>
        <div className={`dataset-actions ${showActions ? 'visible' : 'hidden'}`}>
          <button 
            className="action-btn analyze"
            onClick={() => onAnalyze(dataset)}
            disabled={dataset.processingStatus !== 'ready'}
          >
            Analyze
          </button>
          <button 
            className="action-btn delete"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>
      
      <div className="dataset-metadata">
        <div className="metadata-item">
          <span className="metadata-label">Rows:</span>
          <span className="metadata-value">{dataset.metadata.rows?.toLocaleString() || 'N/A'}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Columns:</span>
          <span className="metadata-value">{dataset.metadata.columns?.toLocaleString() || 'N/A'}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Size:</span>
          <span className="metadata-value">{formatFileSize(dataset.metadata.size)}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Uploaded:</span>
          <span className="metadata-value">{new Date(dataset.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

const UploadModal: React.FC<{ isOpen: boolean; onClose: () => void; onUpload: (file: File, metadata: any) => void }> = ({ 
  isOpen, 
  onClose, 
  onUpload 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    name: '',
    description: '',
    tags: ''
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (isValidFileType(file)) {
        setSelectedFile(file);
        setUploadMetadata(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (isValidFileType(file)) {
        setSelectedFile(file);
        setUploadMetadata(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const isValidFileType = (file: File) => {
    const validTypes = ['.csv', '.json', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return validTypes.includes(fileExtension);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadMetadata.name.trim()) return;
    
    setIsUploading(true);
    try {
      await onUpload(selectedFile, uploadMetadata);
      // Reset form
      setSelectedFile(null);
      setUploadMetadata({ name: '', description: '', tags: '' });
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Dataset</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div 
            className={`upload-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'file-selected' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="file-preview">
                <div className="file-icon">📄</div>
                <div className="file-info">
                  <div className="file-name">{selectedFile.name}</div>
                  <div className="file-size">{formatFileSize(selectedFile.size)}</div>
                </div>
                <button 
                  className="file-remove"
                  onClick={() => setSelectedFile(null)}
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <div className="upload-icon">📁</div>
                <div className="upload-text">
                  <h3>Drag and drop your dataset here</h3>
                  <p>or click to browse files</p>
                  <p className="upload-formats">Supports: CSV, JSON, Excel (.xlsx, .xls)</p>
                </div>
                <input 
                  type="file" 
                  className="file-input"
                  accept=".csv,.json,.xlsx,.xls"
                  onChange={handleFileInput}
                />
              </>
            )}
          </div>
          
          {selectedFile && (
            <div className="upload-metadata">
              <div className="form-group">
                <label className="form-label">Dataset Name</label>
                <input 
                  type="text"
                  className="form-input"
                  value={uploadMetadata.name}
                  onChange={e => setUploadMetadata(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter dataset name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea 
                  className="form-textarea"
                  value={uploadMetadata.description}
                  onChange={e => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this dataset contains..."
                  rows={3}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Tags (optional)</label>
                <input 
                  type="text"
                  className="form-input"
                  value={uploadMetadata.tags}
                  onChange={e => setUploadMetadata(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., sales, finance, marketing (comma-separated)"
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || !uploadMetadata.name.trim() || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Dataset'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DatasetsMainPage: React.FC = () => {
  const { datasets, fetchDatasets, uploadDataset, deleteDataset, isLoading } = useDataset();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleUpload = async (file: File, metadata: any) => {
    try {
      await uploadDataset(file, metadata);
      addNotification({
        type: 'success',
        title: 'Upload Successful',
        message: `Dataset "${metadata.name}" has been uploaded successfully.`
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error.message || 'Failed to upload dataset. Please try again.'
      });
      throw error;
    }
  };

  const handleDelete = async (datasetId: string) => {
    try {
      await deleteDataset(datasetId);
      addNotification({
        type: 'success',
        title: 'Dataset Deleted',
        message: 'Dataset has been deleted successfully.'
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.message || 'Failed to delete dataset. Please try again.'
      });
      throw error;
    }
  };

  const handleAnalyze = (dataset: Dataset) => {
    navigate(`/analytics/new?dataset=${dataset._id}`);
  };

  const handleBulkDelete = async () => {
    if (selectedDatasets.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedDatasets.length} dataset(s)?`)) {
      try {
        await Promise.all(selectedDatasets.map(id => deleteDataset(id)));
        setSelectedDatasets([]);
        addNotification({
          type: 'success',
          title: 'Datasets Deleted',
          message: `${selectedDatasets.length} dataset(s) deleted successfully.`
        });
      } catch (error: any) {
        addNotification({
          type: 'error',
          title: 'Delete Failed',
          message: 'Some datasets could not be deleted. Please try again.'
        });
      }
    }
  };

  const filteredAndSortedDatasets = (Array.isArray(datasets) ? datasets : [])
    .filter(dataset => {
      const matchesSearch = dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (dataset.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || dataset.processingStatus === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.metadata.size - a.metadata.size;
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });



  return (
    <div className="datasets-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Datasets</h1>
            <p>Manage and analyze your data collections</p>
          </div>
          <button 
            className="btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <span className="btn-icon">📁</span>
            Upload Dataset
          </button>
        </div>
      </div>

      <div className="datasets-controls">
        <div className="controls-left">
          <div className="search-box">
            <input 
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
            
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as 'name' | 'date' | 'size')}
              className="filter-select"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
            </select>
          </div>
        </div>
        
        <div className="controls-right">
          {selectedDatasets.length > 0 && (
            <div className="bulk-actions">
              <span className="selection-count">{selectedDatasets.length} selected</span>
              <button className="btn-danger" onClick={handleBulkDelete}>
                Delete Selected
              </button>
            </div>
          )}
          
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      <div className={`datasets-content ${viewMode}`}>
        {filteredAndSortedDatasets.length > 0 ? (
          <div className="datasets-grid">
            {filteredAndSortedDatasets.map(dataset => (
              <DatasetCard
                key={dataset._id}
                dataset={dataset}
                onDelete={handleDelete}
                onAnalyze={handleAnalyze}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>{datasets.length === 0 ? 'No datasets yet' : 'No datasets match your search'}</h3>
            <p>
              {datasets.length === 0 
                ? 'Upload your first dataset to get started with AI-powered analytics.'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
            {datasets.length === 0 && (
              <button 
                className="btn-primary"
                onClick={() => setShowUploadModal(true)}
              >
                Upload Dataset
              </button>
            )}
          </div>
        )}
      </div>

      <UploadModal 
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
      />
    </div>
  );
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const DatasetsPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<DatasetsMainPage />} />
      <Route path="/*" element={<DatasetsMainPage />} />
    </Routes>
  );
};

export default DatasetsPage;