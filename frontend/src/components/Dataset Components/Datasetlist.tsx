// src/components/DatasetList.tsx
import React from 'react';
import { useDataset } from '../../contexts/DatasetContext';
import { DatasetCard } from '../../components/Dataset Components/DatasetCard';
import { Dataset } from '../../types';
import "./DatasetComponent.css";

export const DatasetList: React.FC = () => {
  const { datasets, isLoading, error } = useDataset();

  const handleDelete = (id: string) => {
    console.log('Delete dataset with id:', id);
  };

  const handleAnalyze = (dataset: Dataset) => {
    console.log('Analyze dataset:', dataset.name);
  };

  if (isLoading) return <p>Loading datasets...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (datasets.length === 0)
  return <img src="emptydatasets.png" alt="empty-dataset" className="empty-dataset" />;

  return (
    <div className="datasets-page__list">
  {datasets.map((dataset) => (
    <DatasetCard
      key={dataset._id}
      dataset={dataset}
      onDelete={handleDelete}
      onAnalyze={handleAnalyze}
    />
  ))}
</div>
  );
};
