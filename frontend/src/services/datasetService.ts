// src/services/datasetService.ts
import apiClient from './apiClient';
import { Dataset, DatasetResponse } from '../types';

export const datasetService = {
  // ✅ Upload a new dataset (matches POST /api/datasets/upload)
  upload: async (formData: FormData): Promise<Dataset> => {
    const response = await apiClient.post('/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.dataset;
  },

  // ✅ Fetch all datasets (matches GET /api/datasets)
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

  // ✅ Fetch dataset by ID (matches GET /api/datasets/:id)
  getById: async (id: string): Promise<Dataset> => {
    const response = await apiClient.get(`/datasets/${id}`);
    return response.data.data.dataset;
  },

  // ✅ Delete dataset (matches DELETE /api/datasets/:id)
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/datasets/${id}`);
  },

  // ✅ Get dataset preview (matches GET /api/datasets/:id/preview)
  getPreview: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/datasets/${id}/preview`);
    return response.data.data;
  },

  // ✅ Share dataset (matches POST /api/datasets/:id/share)
  share: async (id: string, shareData: any): Promise<void> => {
    await apiClient.post(`/datasets/${id}/share`, shareData);
  },

  // ✅ Remove dataset access (matches DELETE /api/datasets/:id/access/:userId)
  removeAccess: async (id: string, userId: string): Promise<void> => {
    await apiClient.delete(`/datasets/${id}/access/${userId}`);
  },
};
