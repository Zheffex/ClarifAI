// Mock the environment configuration first
const mockEnv = {
  openRouter: {
    apiKey: 'test-api-key',
    model: 'test-model',
    siteUrl: 'https://test.com',
    siteName: 'Test Site'
  }
};

jest.mock('../../src/config/environment', () => ({
  env: mockEnv
}));

// Mock the logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import { OpenRouterService } from '../../src/services/openRouterService';

// Mock fetch globally
global.fetch = jest.fn();

describe('OpenRouterService', () => {
  let openRouterService: OpenRouterService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create new service instance
    openRouterService = new OpenRouterService();
  });

  describe('constructor', () => {
    it('should initialize with environment variables', () => {
      expect(openRouterService).toBeDefined();
    });

    it('should handle missing API key gracefully', () => {
      // Mock environment without API key
      mockEnv.openRouter.apiKey = '';

      const service = new OpenRouterService();
      expect(service.isConfigured()).toBe(false);
      
      // Restore for other tests
      mockEnv.openRouter.apiKey = 'test-api-key';
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is configured', () => {
      // Mock environment with API key
      mockEnv.openRouter.apiKey = 'test-api-key';
      
      const service = new OpenRouterService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      // Mock environment without API key
      mockEnv.openRouter.apiKey = '';

      const service = new OpenRouterService();
      expect(service.isConfigured()).toBe(false);
      
      // Restore for other tests
      mockEnv.openRouter.apiKey = 'test-api-key';
    });
  });

  describe('getModelInfo', () => {
    it('should return model information when configured', () => {
      mockEnv.openRouter.apiKey = 'test-api-key';
      mockEnv.openRouter.model = 'test-model';

      const service = new OpenRouterService();
      const modelInfo = service.getModelInfo();

      expect(modelInfo.configured).toBe(true);
      expect(modelInfo.model).toBe('test-model');
    });

    it('should return not configured status when API key is missing', () => {
      mockEnv.openRouter.apiKey = '';

      const service = new OpenRouterService();
      const modelInfo = service.getModelInfo();

      expect(modelInfo.configured).toBe(false);
      expect(modelInfo.model).toBeDefined();
      
      // Restore for other tests
      mockEnv.openRouter.apiKey = 'test-api-key';
    });
  });

  describe('chatCompletion', () => {
    const mockMessages = [
      { role: 'user' as const, content: 'Hello, how are you?' }
    ];

    beforeEach(() => {
      mockEnv.openRouter.apiKey = 'test-api-key';
      mockEnv.openRouter.model = 'test-model';
      mockEnv.openRouter.siteUrl = 'https://test.com';
      mockEnv.openRouter.siteName = 'Test Site';
    });

    it('should make successful API call', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I am doing well, thank you for asking!'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await openRouterService.chatCompletion(mockMessages);

      expect(result).toBe('I am doing well, thank you for asking!');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'HTTP-Referer': 'https://test.com',
            'X-Title': 'Test Site',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            model: 'test-model',
            messages: mockMessages
          })
        })
      );
    });

    it('should throw error when API key is not configured', async () => {
      mockEnv.openRouter.apiKey = '';

      const service = new OpenRouterService();

      await expect(service.chatCompletion(mockMessages))
        .rejects.toThrow('OpenRouter API key not configured');
        
      // Restore for other tests
      mockEnv.openRouter.apiKey = 'test-api-key';
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request')
      });

      await expect(openRouterService.chatCompletion(mockMessages))
        .rejects.toThrow('OpenRouter API error: 400 - Bad Request');
    });

    it('should handle invalid response format', async () => {
      const mockResponse = {
        choices: [] // Empty choices array
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(openRouterService.chatCompletion(mockMessages))
        .rejects.toThrow('No response from OpenRouter API');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(openRouterService.chatCompletion(mockMessages))
        .rejects.toThrow('Network error');
    });
  });

  describe('analyzeText', () => {
    beforeEach(() => {
      mockEnv.openRouter.apiKey = 'test-api-key';
      mockEnv.openRouter.model = 'test-model';
    });

    it('should analyze text with default analysis type', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This text shows positive sentiment.'
            }
          }
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await openRouterService.analyzeText('I love this product!');

      expect(result).toBe('This text shows positive sentiment.');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('I love this product!')
        })
      );
    });

    it('should analyze text with specific analysis type', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Data analysis shows significant trends.'
            }
          }
        ],
        usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await openRouterService.analyzeText(
        'Sales data for Q1 shows 15% increase',
        'data-analysis'
      );

      expect(result).toBe('Data analysis shows significant trends.');
    });

    it('should use correct system prompt for analysis type', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Image analysis complete.'
            }
          }
        ],
        usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await openRouterService.analyzeText('Analyze this image', 'image-analysis');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[0].content).toContain('image analysis expert');
    });
  });

  describe('analyzeImage', () => {
    beforeEach(() => {
      mockEnv.openRouter.apiKey = 'test-api-key';
      mockEnv.openRouter.model = 'test-model';
    });

    it('should analyze image with default question', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This image shows a bar chart with sales data.'
            }
          }
        ],
        usage: { prompt_tokens: 20, completion_tokens: 12, total_tokens: 32 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await openRouterService.analyzeImage('data:image/jpeg;base64,abc123');

      expect(result).toBe('This image shows a bar chart with sales data.');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('What is in this image?')
        })
      );
    });

    it('should analyze image with custom question', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'The chart shows a declining trend.'
            }
          }
        ],
        usage: { prompt_tokens: 25, completion_tokens: 10, total_tokens: 35 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await openRouterService.analyzeImage(
        'data:image/jpeg;base64,abc123',
        'What trend do you see in this chart?'
      );

      expect(result).toBe('The chart shows a declining trend.');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('What trend do you see in this chart?')
        })
      );
    });

    it('should format image content correctly', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Image analyzed.'
            }
          }
        ],
        usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await openRouterService.analyzeImage('data:image/jpeg;base64,abc123', 'Test question');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      
      expect(requestBody.messages[0].content).toEqual([
        {
          type: 'text',
          text: 'Test question'
        },
        {
          type: 'image_url',
          image_url: {
            url: 'data:image/jpeg;base64,abc123'
          }
        }
      ]);
    });
  });

  describe('generateDataInsights', () => {
    beforeEach(() => {
      mockEnv.openRouter.apiKey = 'test-api-key';
      mockEnv.openRouter.model = 'test-model';
    });

    it('should generate insights for data', async () => {
      const mockData = [
        { name: 'Product A', sales: 100, category: 'Electronics' },
        { name: 'Product B', sales: 150, category: 'Electronics' }
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Key insights: Sales are trending upward with Electronics leading the category.'
            }
          }
        ],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await openRouterService.generateDataInsights(mockData);

      expect(result).toBe('Key insights: Sales are trending upward with Electronics leading the category.');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Dataset preview')
        })
      );
    });

    it('should include context when provided', async () => {
      const mockData = [{ value: 100 }];
      const context = 'Business analysis for Q1';

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Business insights for Q1.'
            }
          }
        ],
        usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await openRouterService.generateDataInsights(mockData, context);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      
      expect(requestBody.messages[1].content).toContain('Business analysis for Q1');
    });

    it('should limit data preview to first 5 rows', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({ id: i, value: i * 10 }));

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Analysis complete.'
            }
          }
        ],
        usage: { prompt_tokens: 40, completion_tokens: 5, total_tokens: 45 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await openRouterService.generateDataInsights(mockData);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      
      // Should only include first 5 rows in the prompt
      const dataPreview = JSON.parse(requestBody.messages[1].content.match(/```json\n([\s\S]*?)\n```/)?.[1] || '[]');
      expect(dataPreview).toHaveLength(5);
    });
  });

  describe('getSystemPrompt', () => {
    it('should return correct prompt for general analysis', () => {
      const service = new OpenRouterService();
      const prompt = (service as any).getSystemPrompt('general');
      
      expect(prompt).toContain('helpful AI assistant');
    });

    it('should return correct prompt for data analysis', () => {
      const service = new OpenRouterService();
      const prompt = (service as any).getSystemPrompt('data-analysis');
      
      expect(prompt).toContain('data analysis expert');
      expect(prompt).toContain('patterns');
      expect(prompt).toContain('trends');
    });

    it('should return correct prompt for image analysis', () => {
      const service = new OpenRouterService();
      const prompt = (service as any).getSystemPrompt('image-analysis');
      
      expect(prompt).toContain('image analysis expert');
      expect(prompt).toContain('objects');
      expect(prompt).toContain('scenes');
    });

    it('should return correct prompt for text analysis', () => {
      const service = new OpenRouterService();
      const prompt = (service as any).getSystemPrompt('text-analysis');
      
      expect(prompt).toContain('text analysis expert');
      expect(prompt).toContain('sentiment');
      expect(prompt).toContain('themes');
    });

    it('should return default prompt for unknown type', () => {
      const service = new OpenRouterService();
      const prompt = (service as any).getSystemPrompt('unknown-type');
      
      expect(prompt).toContain('helpful AI assistant');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockEnv.openRouter.apiKey = 'test-api-key';
      mockEnv.openRouter.model = 'test-model';
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(openRouterService.chatCompletion([{ role: 'user', content: 'test' }]))
        .rejects.toThrow('Invalid JSON');
    });

    it('should handle missing choices in response', async () => {
      const mockResponse = {
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        // Missing choices array
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(openRouterService.chatCompletion([{ role: 'user', content: 'test' }]))
        .rejects.toThrow('No response from OpenRouter API');
    });

    it('should handle empty choices array', async () => {
      const mockResponse = {
        choices: [],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(openRouterService.chatCompletion([{ role: 'user', content: 'test' }]))
        .rejects.toThrow('No response from OpenRouter API');
    });

    it('should handle missing message content', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant'
              // Missing content
            }
          }
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(openRouterService.chatCompletion([{ role: 'user', content: 'test' }]))
        .rejects.toThrow('Invalid response format from OpenRouter API');
    });
  });

  describe('Usage Logging', () => {
    beforeEach(() => {
      mockEnv.openRouter.apiKey = 'test-api-key';
      mockEnv.openRouter.model = 'test-model';
    });

    it('should log usage information', async () => {
      const mockResponse = {
        model: 'test-model',
        choices: [
          {
            message: {
              content: 'Test response'
            }
          }
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Mock logger
      const mockLogger = require('../../src/config/logger').logger;

      await openRouterService.chatCompletion([{ role: 'user', content: 'test' }]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'OpenRouter API usage:',
        expect.objectContaining({
          model: 'test-model',
          tokens: expect.objectContaining({
            prompt_tokens: 20,
            completion_tokens: 10,
            total_tokens: 30
          })
        })
      );
    });
  });
});
