// src/contexts/DatasetContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dataset } from '../types';
import { datasetService } from '../services/datasetService';

interface DatasetContextProps {
  datasets: Dataset[];
  fetchDatasets: () => Promise<void>;
  uploadDataset: (file: File, name: string, description?: string, tags?: string[]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const DatasetContext = createContext<DatasetContextProps>({} as DatasetContextProps);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDatasets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await datasetService.getAll();
      setDatasets(data.datasets);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch datasets');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDataset = async (file: File, name: string, description?: string, tags?: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      if (description) formData.append('description', description);
      if (tags) formData.append('tags', JSON.stringify(tags));

      const dataset = await datasetService.upload(formData);
      setDatasets(prev => [dataset, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to upload dataset');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  return (
    <DatasetContext.Provider value={{ datasets, fetchDatasets, uploadDataset, isLoading, error }}>
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => useContext(DatasetContext);
