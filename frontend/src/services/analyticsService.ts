// src/services/analyticsService.ts
import apiClient from "./apiClient";

export const analyticsService = {
  // ✅ Process natural language query (matches POST /api/analytics/query)
  processQuery: async (query: string, datasetId: string) => {
    const response = await apiClient.post("/analytics/query", { query, datasetId });
    return response.data;
  },

  // ✅ Generate insights (matches POST /api/analytics/insights)
  generateInsights: async (datasetId: string, insightTypes: string[] = ["trends", "anomalies", "correlations"]) => {
    const response = await apiClient.post("/analytics/insights", { datasetId, insightTypes });
    return response.data;
  },
};
