import React from 'react';
import { useDataset } from '../../contexts/DatasetContext';
import { DatasetCard } from '../../components/Dataset Components/DatasetCard';
import { Dataset } from '../../types';
import "./DatasetComponent.css";

interface DatasetListProps {
  datasets?: Dataset[];
  viewMode?: 'grid' | 'list';
  onDatasetAction?: (action: string, dataset: Dataset) => void;
}

export const DatasetList: React.FC<DatasetListProps> = ({ 
  datasets: propDatasets, 
  viewMode = 'grid',
  onDatasetAction 
}) => {
  const { datasets: contextDatasets, isLoading, error } = useDataset();
  const datasets = propDatasets || contextDatasets;

  const handleDelete = (id: string) => {
    const dataset = datasets.find(d => d._id === id);
    if (dataset) {
      onDatasetAction?.('delete', dataset);
    }
  };

  const handleAnalyze = (dataset: Dataset) => {
    onDatasetAction?.('analyze', dataset);
  };

  const handleView = (dataset: Dataset) => {
    onDatasetAction?.('view', dataset);
  };

  if (isLoading) {
    return (
      <div className="datasets-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p>Loading datasets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="datasets-error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to load datasets</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="datasets-empty">
        <div className="empty-icon">📊</div>
        <h3>No datasets found</h3>
        <p>Upload your first dataset to get started with data analysis</p>
      </div>
    );
  }

  return (
    <div className={`datasets-list ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
      {datasets.filter(dataset => dataset && dataset._id).map((dataset) => (
        <DatasetCard
          key={dataset._id}
          dataset={dataset}
          onDelete={handleDelete}
          onAnalyze={handleAnalyze}
          onView={handleView}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};