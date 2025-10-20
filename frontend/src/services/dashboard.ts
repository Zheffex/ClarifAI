// src/services/dashboardService.ts
import apiClient from "./apiClient";

export const dashboardService = {
  getOverview: async () => {
    const response = await apiClient.get("/dashboard/overview");
    return response.data;
  },
};
