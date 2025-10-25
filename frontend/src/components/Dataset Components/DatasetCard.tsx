// src/components/Dataset Components/DatasetCard.tsx
import React from 'react';
import { Dataset } from '../../types';
import "./DatasetComponent.css";
import { FileChartColumn } from 'lucide-react';
import { useDataset } from '../../contexts/DatasetContext';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface DatasetCardProps {
  dataset: Dataset;
}

export const DatasetCard: React.FC<DatasetCardProps> = ({ dataset }) => {
  const { deleteDataset, analyzeDataset, isLoading } = useDataset();

  return (
    <div className="dataset-card">
      <div className="dataset-card__header">
        <div className="dataset-card__icon">
          <FileChartColumn size={30} />
        </div>

        <div className="dataset-card__info">
          <h3>{dataset.name}</h3>
          <p>{dataset.description || 'No description available'}</p>
        </div>

        <span
          className={`dataset-card__status ${
            dataset.processingStatus === 'ready'
              ? 'status--ready'
              : dataset.processingStatus === 'processing'
              ? 'status--processing'
              : dataset.processingStatus === 'error'
              ? 'status--failed'
              : 'status--pending'
          }`}
        >
          {dataset.processingStatus || 'pending'}
        </span>
      </div>

      <div className="dataset-card__details">
        <p><strong>Rows:</strong> {dataset.metadata.rows || 'N/A'}</p>
        <p><strong>Columns:</strong> {dataset.metadata.columns || 'N/A'}</p>
        <p><strong>Size:</strong> {formatFileSize(dataset.metadata.size)}</p>
      </div>

      <p className="dataset-card__uploaded">
        <strong>Uploaded:</strong> {new Date(dataset.createdAt).toLocaleDateString()}
      </p>

      <div className="dataset-actions">
        <button onClick={() => analyzeDataset(dataset)} disabled={isLoading}>
          Analyze
        </button>

        <button onClick={() => deleteDataset(dataset._id)} disabled={isLoading}>
          Delete
        </button>
      </div>
    </div>
  );
};
