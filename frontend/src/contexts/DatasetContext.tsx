// src/contexts/DatasetContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dataset } from '../types';
import { datasetService } from '../services/datasetService';
import { analyticsService } from '../services/analyticsService';
import { AuthContext } from './AuthContext';

interface DatasetContextProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  insights: any;
  fetchDatasets: () => Promise<void>;
  refreshDatasets: () => Promise<void>;
  uploadDataset: (file: File, name: string, description?: string, tags?: string[]) => Promise<void>;
  deleteDataset: (id: string) => Promise<void>;
  selectDataset: (id: string) => Promise<void>;
  analyzeDataset: (dataset: Dataset) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const DatasetContext = createContext<DatasetContextProps>({} as DatasetContextProps);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authContext = useContext(AuthContext);
  
  // Provide default values if AuthContext is not available
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const token = authContext?.token ?? null;
  
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDatasets = async () => {
    // Only fetch datasets if user is authenticated
    if (!isAuthenticated || !token) {
      setDatasets([]);
      return;
    }
    
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

  // Refresh datasets function (alias for fetchDatasets)
  const refreshDatasets = async () => {
    await fetchDatasets();
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

  // 🧹 DELETE dataset
  const deleteDataset = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await datasetService.delete(id);
      // remove from local state
      setDatasets(prev => prev.filter(d => d._id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete dataset');
    } finally {
      setIsLoading(false);
    }
  };

  // SELECT dataset
  const selectDataset = async (id: string) => {
    const dataset = datasets.find(d => d._id === id);
    if (dataset) {
      setSelectedDataset(dataset);
    } else {
      setError('Dataset not found');
    }
  };

  // 🔍 ANALYZE dataset using analytics service
  const analyzeDataset = async (dataset: Dataset) => {
    setIsLoading(true);
    setError(null);
    try {
      // Generate insights for the dataset
      const insights = await analyticsService.generateInsights(dataset._id);
      setInsights(insights);
      setSelectedDataset(dataset);
      console.log('Analysis complete for dataset:', dataset.name, insights);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze dataset');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [isAuthenticated, token]);

  // Clear datasets when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setDatasets([]);
      setSelectedDataset(null);
      setInsights(null);
      setError(null);
    }
  }, [isAuthenticated]);

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        selectedDataset,
        insights,
        fetchDatasets,
        refreshDatasets,
        uploadDataset,
        deleteDataset,
        selectDataset,
        analyzeDataset,
        isLoading,
        error,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => useContext(DatasetContext);
