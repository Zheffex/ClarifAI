import { logger } from '../config/logger';
import { env } from '../config/environment';

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterService {
  private apiKey: string;
  private model: string;
  private siteUrl: string;
  private siteName: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    this.apiKey = env.openRouter.apiKey;
    this.model = env.openRouter.model;
    this.siteUrl = env.openRouter.siteUrl;
    this.siteName = env.openRouter.siteName;

    if (!this.apiKey) {
      logger.warn('OpenRouter API key not configured');
    }
  }

  /**
   * Send a chat completion request to OpenRouter
   */
  async chatCompletion(messages: OpenRouterMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenRouter API error:', { status: response.status, error: errorText });
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as OpenRouterResponse;
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenRouter API');
      }

      const choice = data.choices[0];
      if (!choice || !choice.message || !choice.message.content) {
        throw new Error('Invalid response format from OpenRouter API');
      }

      const content = choice.message.content;
      
      // Log usage for monitoring
      logger.info('OpenRouter API usage:', {
        model: data.model,
        tokens: data.usage
      });

      return content;
    } catch (error) {
      logger.error('OpenRouter service error:', error);
      throw error;
    }
  }

  /**
   * Analyze text with AI
   */
  async analyzeText(text: string, analysisType: string = 'general'): Promise<string> {
    const systemPrompt = this.getSystemPrompt(analysisType);
    
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: text
      }
    ];

    return await this.chatCompletion(messages);
  }

  /**
   * Analyze image with AI
   */
  async analyzeImage(imageUrl: string, question: string = 'What is in this image?'): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: question
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ];

    return await this.chatCompletion(messages);
  }

  /**
   * Generate data insights using AI
   */
  async generateDataInsights(data: any[], context?: string): Promise<string> {
    const dataPreview = JSON.stringify(data.slice(0, 5), null, 2);
    const totalRows = data.length;
    
    const prompt = `Analyze this dataset and provide insights:

Dataset preview (first 5 rows out of ${totalRows} total):
\`\`\`json
${dataPreview}
\`\`\`

${context ? `Additional context: ${context}` : ''}

Please provide:
1. Summary of the data structure
2. Key patterns and trends
3. Data quality observations
4. Suggested analysis approaches
5. Potential insights or recommendations

Format your response in clear sections with actionable insights.`;

    return await this.analyzeText(prompt, 'data-analysis');
  }

  /**
   * Get system prompt based on analysis type
   */
  private getSystemPrompt(analysisType: string): string {
    const prompts = {
      'general': 'You are a helpful AI assistant. Provide clear, accurate, and concise responses.',
      'data-analysis': 'You are a data analysis expert. Provide detailed insights about datasets, identify patterns, trends, and data quality issues. Suggest actionable recommendations based on the data.',
      'image-analysis': 'You are an image analysis expert. Describe images in detail, identify objects, scenes, and provide relevant insights.',
      'text-analysis': 'You are a text analysis expert. Analyze text for sentiment, themes, key information, and provide structured insights.'
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.general;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get current model information
   */
  getModelInfo(): { model: string; configured: boolean } {
    return {
      model: this.model,
      configured: this.isConfigured()
    };
  }
}

export const openRouterService = new OpenRouterService();