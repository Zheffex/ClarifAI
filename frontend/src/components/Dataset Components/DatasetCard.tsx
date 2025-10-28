import React, { useState } from 'react';
import {
  FileChartColumn,
  Eye,
  BarChart3,
  Trash2,
  Calendar,
  Database,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Dataset } from '../../types';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import "./DatasetComponent.css";

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  
  // Reset time to start of day for accurate comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // Check if it's today
  if (dateOnly.getTime() === today.getTime()) {
    return 'Today';
  }
  
  // Check if it's yesterday
  if (dateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  
  // Calculate days difference
  const diffTime = today.getTime() - dateOnly.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Check if it's within the last week (7 days)
  if (diffDays <= 7) {
    return `${diffDays} days ago`;
  }
  
  // Check if it's within the last month (30 days)
  if (diffDays <= 30) {
    const weeks = Math.ceil(diffDays / 7);
    return weeks === 1 ? 'Last week' : `${weeks} weeks ago`;
  }
  
  // Check if it's within the last year
  if (diffDays <= 365) {
    const months = Math.ceil(diffDays / 30);
    return months === 1 ? 'Last month' : `${months} months ago`;
  }
  
  // For dates older than a year, show the actual date
  return date.toLocaleDateString();
};

interface DatasetCardProps {
  dataset: Dataset;
  onDelete?: (id: string) => void;
  onAnalyze?: (dataset: Dataset) => void;
  onView?: (dataset: Dataset) => void;
  viewMode?: 'grid' | 'list';
}

export const DatasetCard: React.FC<DatasetCardProps> = ({ 
  dataset, 
  onDelete, 
  onAnalyze, 
  onView,
  viewMode = 'grid'
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ready': return CheckCircle;
      case 'processing': return Clock;
      case 'failed': 
      case 'error': return AlertCircle;
      case 'pending': return Clock;
      default: return CheckCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ready': return '#10b981';
      case 'processing': return '#f59e0b';
      case 'failed': 
      case 'error': return '#ef4444';
      case 'pending': return '#6b7280';
      default: return '#10b981';
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
      case 'tsv':
        return FileText;
      case 'xlsx':
      case 'xls':
        return FileChartColumn;
      case 'json':
        return FileText;
      default:
        return Database;
    }
  };

  const handleDeleteClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      onDelete?.(dataset._id);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  const StatusIcon = getStatusIcon(dataset.processingStatus || 'ready');
  const FileIcon = getFileIcon(dataset.name);

  if (viewMode === 'list') {
    return (
      <div className="dataset-card list-view">
        <div className="dataset-card__main">
          <div className="dataset-card__icon">
            <FileIcon className="file-icon" />
          </div>
          
          <div className="dataset-card__info">
            <div className="dataset-card__header">
              <h3>{dataset.name}</h3>
              <div className="dataset-card__status">
                <StatusIcon 
                  className="status-icon" 
                  style={{ color: getStatusColor(dataset.processingStatus || 'ready') }}
                />
                <span className="status-text">{dataset.processingStatus || 'ready'}</span>
              </div>
            </div>
            
            <p className="dataset-description">
              {dataset.description || 'No description available'}
            </p>
            
            <div className="dataset-card__meta">
              <span className="meta-item">
                <Database className="meta-icon" />
                {dataset.metadata?.rows || 0} rows
              </span>
              <span className="meta-item">
                <FileText className="meta-icon" />
                {dataset.metadata?.columns || 0} columns
              </span>
              <span className="meta-item">
                <Calendar className="meta-icon" />
                {formatDate(dataset.createdAt.toString())}
              </span>
              <span className="meta-item">
                {formatFileSize(dataset.metadata?.size || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="dataset-card__actions">
          <button 
            className="action-btn primary"
            onClick={(e) => handleDeleteClick(e)}
            disabled={isDeleting}
            title="Delete Dataset"
          >
            <Trash2 className="btn-icon" />
          </button>
          <button 
            className={`action-btn secondary ${(dataset.processingStatus === 'failed' || dataset.processingStatus === 'error') ? 'disabled' : ''}`}
            onClick={() => onAnalyze?.(dataset)}
            title={dataset.processingStatus === 'failed' || dataset.processingStatus === 'error' ? 'Cannot analyze: Dataset failed to process' : 'Analyze Dataset'}
            disabled={dataset.processingStatus === 'failed' || dataset.processingStatus === 'error'}
          >
            <BarChart3 className="btn-icon" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dataset-card grid-view">
      <div className="dataset-card__header">
        <div className="dataset-card__icon">
          <FileIcon className="file-icon" />
        </div>

        <div className="dataset-card__content">
          <div className="dataset-card__title-section">
            <h3 className="dataset-card__title">{dataset.name}</h3>
            <div className="dataset-card__status">
              <StatusIcon 
                className="status-icon" 
                style={{ color: getStatusColor(dataset.processingStatus || 'ready') }}
              />
              <span className="status-text">{dataset.processingStatus || 'ready'}</span>
            </div>
          </div>
          <p className="dataset-card__description">{dataset.description || 'No description available'}</p>
        </div>
      </div>

      <div className="dataset-card__details">
        <div className="detail-item">
          <Database className="detail-icon" />
          <span className="detail-label">Rows</span>
          <span className="detail-value">{dataset.metadata?.rows || 0}</span>
        </div>
        <div className="detail-item">
          <FileText className="detail-icon" />
          <span className="detail-label">Columns</span>
          <span className="detail-value">{dataset.metadata?.columns || 0}</span>
        </div>
        <div className="detail-item">
          <Calendar className="detail-icon" />
          <span className="detail-label">Created</span>
          <span className="detail-value">{formatDate(dataset.createdAt.toString())}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Size</span>
          <span className="detail-value">{formatFileSize(dataset.metadata?.size || 0)}</span>
        </div>
      </div>

      <div className="dataset-card__footer">
        <div className="dataset-card__actions">
          <button 
            className="action-btn primary"
            onClick={(e) => handleDeleteClick(e)}
            disabled={isDeleting}
            title="Delete Dataset"
          >
            <Trash2 className="btn-icon" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button 
            className={`action-btn secondary ${(dataset.processingStatus === 'failed' || dataset.processingStatus === 'error') ? 'disabled' : ''}`}
            onClick={() => onAnalyze?.(dataset)}
            title={dataset.processingStatus === 'failed' || dataset.processingStatus === 'error' ? 'Cannot analyze: Dataset failed to process' : 'Analyze Dataset'}
            disabled={dataset.processingStatus === 'failed' || dataset.processingStatus === 'error'}
          >
            <BarChart3 className="btn-icon" />
          Analyze
        </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        datasetName={dataset.name}
        isDeleting={isDeleting}
      />
    </div>
  );
};