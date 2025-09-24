import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Dataset, DatasetContextType } from '../types';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const uploadDataset = async (file: File, metadata: any): Promise<Dataset> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('dataset', file);
      if (metadata.name) formData.append('name', metadata.name);
      if (metadata.description) formData.append('description', metadata.description);
      
      const response = await api.post('/datasets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const newDataset = response.data.data;
      setDatasets(prev => [newDataset, ...prev]);
      return newDataset;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to upload dataset';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDatasets = async (): Promise<void> => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastFetchTime < 5000) { // 5 second cooldown
      return;
    }
    
    if (isLoading) return; // Prevent concurrent requests
    
    setIsLoading(true);
    setError(null);
    setLastFetchTime(now);
    
    try {
      const response = await api.get('/datasets');
      const fetchedDatasets = response.data.data || [];
      // Ensure we always set an array
      setDatasets(Array.isArray(fetchedDatasets) ? fetchedDatasets : []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to fetch datasets';
      setError(errorMessage);
      // Set empty array on error
      setDatasets([]);
      console.error('Dataset fetch error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const selectDataset = async (datasetId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/datasets/${datasetId}`);
      setCurrentDataset(response.data.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to select dataset';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDataset = async (datasetId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await api.delete(`/datasets/${datasetId}`);
      setDatasets(prev => prev.filter(dataset => dataset._id !== datasetId));
      if (currentDataset?._id === datasetId) {
        setCurrentDataset(null);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete dataset';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
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