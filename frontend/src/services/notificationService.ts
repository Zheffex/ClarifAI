// src/services/notificationService.ts
import apiClient from "./apiClient";

export const notificationService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) => {
    const response = await apiClient.get("/notifications", { params });
    return response.data;
  },
};
