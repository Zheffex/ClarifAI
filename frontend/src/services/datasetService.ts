// src/services/datasetService.ts
import apiClient from "./apiClient";

export const datasetService = {
  upload: async (formData: FormData) => {
    const response = await apiClient.post("/datasets/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tags?: string[];
  }) => {
    const response = await apiClient.get("/datasets", { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/datasets/${id}`);
    return response.data;
  },
};
