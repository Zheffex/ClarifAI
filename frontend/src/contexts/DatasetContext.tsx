import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Dataset, DatasetContextType } from '../types';

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [datasets] = useState<Dataset[]>([]);
  const [currentDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadDataset = async (file: File, metadata: any): Promise<Dataset> => {
    // Placeholder implementation
    throw new Error('Upload dataset not yet implemented');
  };

  const fetchDatasets = async (): Promise<void> => {
    // Placeholder implementation
    setIsLoading(true);
    setError(null);
    setIsLoading(false);
  };

  const selectDataset = async (datasetId: string): Promise<void> => {
    // Placeholder implementation
    throw new Error('Select dataset not yet implemented');
  };

  const deleteDataset = async (datasetId: string): Promise<void> => {
    // Placeholder implementation
    throw new Error('Delete dataset not yet implemented');
  };

  const value: DatasetContextType = {
    datasets,
    currentDataset,
    isLoading,
    error,
    uploadDataset,
    fetchDatasets,
    selectDataset,
    deleteDataset,
  };

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}