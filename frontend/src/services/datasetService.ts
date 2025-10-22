import apiClient from './apiClient'; // axios instance with baseURL
import { Dataset, DatasetResponse } from '../types';

export const datasetService = {
  upload: async (formData: FormData): Promise<Dataset> => {
    const response = await apiClient.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data.dataset;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tags?: string[];
  }): Promise<DatasetResponse> => {
    const response = await apiClient.get('/datasets', { params });
    return response.data.data;
  },

  getById: async (id: string): Promise<Dataset> => {
    const response = await apiClient.get(`/datasets/${id}`);
    return response.data.data.dataset;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/datasets/${id}`);
  },
};
