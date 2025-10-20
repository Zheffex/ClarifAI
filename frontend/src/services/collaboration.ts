// src/services/collaborationService.ts
import apiClient from "./apiClient";

export const collaborationService = {
  share: async (resourceType: string, resourceId: string, userId: string, permission: string) => {
    const response = await apiClient.post("/collaboration/share", {
      resourceType,
      resourceId,
      userId,
      permission,
    });
    return response.data;
  },
};
