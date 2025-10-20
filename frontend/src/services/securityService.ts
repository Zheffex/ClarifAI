// src/services/securityService.ts
import apiClient from "./apiClient";

export const securityService = {
  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get("/security/audit-logs", { params });
    return response.data;
  },
};
