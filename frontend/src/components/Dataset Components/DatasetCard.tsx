// src/components/Dataset Components/DatasetCard.tsx
import React from 'react';
import { Dataset } from '../../types/index';
import "./DatasetComponent.css";

interface DatasetCardProps {
  dataset: Dataset;
  onDelete: (id: string) => void;
  onAnalyze: (dataset: Dataset) => void;
}

export const DatasetCard: React.FC<DatasetCardProps> = ({ dataset, onDelete, onAnalyze }) => {
  return (
    <div className="dataset-card">
  <div className="dataset-card__header">
    <div className="dataset-card__icon">
      📄
    </div>

    <div className="dataset-card__info">
      <h3>{dataset.name}</h3>
      <p>{dataset.description || 'No description available'}</p>
    </div>

    <span
  className={`dataset-card__status ${
    (dataset as any).processingStatus === 'Ready' ? 'status--ready' : 'status--pending'
  }`}
>
  {(dataset as any).processingStatus || 'Pending'}
</span>

  </div>

  <div className="dataset-card__details">
    <p><strong>Rows:</strong> {dataset.rows}</p>
    <p><strong>Columns:</strong> {dataset.columns}</p>
    <p><strong>Size:</strong> {dataset.size}</p>
  </div>

  <p className="dataset-card__uploaded">
    <strong>Uploaded:</strong> {new Date(dataset.createdAt).toLocaleDateString()}
  </p>

  <div className="dataset-actions">
    <button onClick={() => onAnalyze(dataset)}>Analyze</button>
    <button onClick={() => onDelete(dataset._id)}>Delete</button>
  </div>
</div>

  );
};
