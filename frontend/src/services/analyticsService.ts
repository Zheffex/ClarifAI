// src/services/analyticsService.ts
import apiClient from "./apiClient";

export const analyticsService = {
  processQuery: async (query: string, datasetId: string) => {
    const response = await apiClient.post("/analytics/query", { query, datasetId });
    return response.data;
  },

  generateInsights: async (datasetId: string, insightTypes: string[]) => {
    const response = await apiClient.post("/analytics/insights", { datasetId, insightTypes });
    return response.data;
  },
};
