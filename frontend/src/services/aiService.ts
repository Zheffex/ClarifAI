// src/services/aiService.ts
import apiClient from "./apiClient";

export const aiService = {
  // ✅ Chat completion (matches POST /api/ai/chat-completion)
  chatCompletion: async (message: string, context?: any) => {
    const response = await apiClient.post("/ai/chat-completion", { message, context });
    return response.data;
  },

  // ✅ Text analysis (matches POST /api/ai/analyze-text)
  analyzeText: async (text: string, analysisType: string) => {
    const response = await apiClient.post("/ai/analyze-text", { text, analysisType });
    return response.data;
  },
};
