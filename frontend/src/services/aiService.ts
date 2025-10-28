// src/services/aiService.ts
import apiClient from "./apiClient";

export const aiService = {
  // ✅ Chat completion (matches POST /api/ai/chat-completion)
  chatCompletion: async (message: string, context?: any) => {
    try {
      const messages = [
        {
          role: 'user',
          content: message
        }
      ];
      
      const response = await apiClient.post("/ai/chat-completion", { messages, context });
      return response.data;
    } catch (error) {
      // Fallback to mock response if backend AI service is not available
      console.warn('AI Service unavailable, using fallback response:', error);
      return {
        data: {
          response: `I understand you're asking about "${message}". I'm currently in fallback mode as the AI service isn't fully configured. To enable full AI functionality, please configure the OpenRouter API key in your backend environment variables.`
        }
      };
    }
  },

  // ✅ Text analysis (matches POST /api/ai/analyze-text)
  analyzeText: async (text: string, analysisType: string) => {
    try {
      const response = await apiClient.post("/ai/analyze-text", { text, analysisType });
      return response.data;
    } catch (error) {
      // Fallback to mock response
      console.warn('AI Text Analysis unavailable, using fallback response:', error);
      return {
        data: {
          analysis: `Analysis of "${text}" (${analysisType}): This is a fallback response. Please configure the AI service for full functionality.`
        }
      };
    }
  },
};
