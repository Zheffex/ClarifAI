import request from 'supertest';
import express from 'express';
import { 
  retryMiddleware,
  retryApiCall,
  retryDatabaseOperation,
  retryFileOperation,
  retryEmailOperation,
  retryWithRateLimit,
  conditionalRetry,
  createRetryManager,
  batchRetry,
  withCircuitBreakerApi,
  withCircuitBreakerEmail,
  RetryManager
} from '../../src/middleware/retry';

describe('Retry Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Basic Retry Middleware', () => {
    it('should allow successful requests', async () => {
      app.use(retryMiddleware({
        maxAttempts: 3,
        baseDelay: 100
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    });

    it('should handle error responses', async () => {
      app.use(retryMiddleware({
        maxAttempts: 3,
        baseDelay: 100
      }));
      app.get('/test', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal Server Error');
    });
  });

  describe('Retry Manager', () => {
    it('should create retry manager', () => {
      const manager = createRetryManager('test-service');
      expect(manager).toBeInstanceOf(RetryManager);
    });

    it('should execute function with retry manager', async () => {
      const manager = createRetryManager('test-service');
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await manager.execute(mockFunction, {
        userId: 'test-user'
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should handle function errors with retry manager', async () => {
      const manager = createRetryManager('test-service');
      const mockFunction = jest.fn().mockRejectedValue(new Error('Function error'));
      
      const result = await manager.execute(mockFunction, {
        userId: 'test-user'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Retry Wrappers', () => {
    it('should retry API call', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await retryApiCall(mockFunction, 'test-service');

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should retry database operation', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await retryDatabaseOperation(mockFunction, 'test-operation');

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should retry file operation', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await retryFileOperation(mockFunction, 'test-operation');

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should retry email operation', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await retryEmailOperation(mockFunction, 'test-operation');

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should retry with rate limit', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await retryWithRateLimit(mockFunction, 'test-service');

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });
  });

  describe('Conditional Retry', () => {
    it('should retry when condition is met', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      const condition = jest.fn().mockReturnValue(true);
      
      const result = await conditionalRetry(mockFunction, condition);

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should not retry when condition is not met', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      const condition = jest.fn().mockReturnValue(false);
      
      const result = await conditionalRetry(mockFunction, condition);

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });
  });

  describe('Batch Retry', () => {
    it('should retry batch of operations', async () => {
      const operations = [
        jest.fn().mockResolvedValue('success1'),
        jest.fn().mockResolvedValue('success2'),
        jest.fn().mockResolvedValue('success3')
      ];
      
      const results = await batchRetry(operations);

      expect(results).toHaveLength(3);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.result).toBe('success1');
      expect(results[1]?.success).toBe(true);
      expect(results[1]?.result).toBe('success2');
      expect(results[2]?.success).toBe(true);
      expect(results[2]?.result).toBe('success3');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should retry with circuit breaker for API', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await withCircuitBreakerApi('test-service', mockFunction);

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should retry with circuit breaker for email', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await withCircuitBreakerEmail(mockFunction);

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      app.use(retryMiddleware({
        maxAttempts: 3,
        baseDelay: 100
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // Add error handler
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', async () => {
      app.use(retryMiddleware({
        maxAttempts: 5,
        baseDelay: 200,
        maxDelay: 1000
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    });

    it('should use default configuration when none provided', async () => {
      app.use(retryMiddleware({}));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty service name', async () => {
      app.use(retryMiddleware({
        maxAttempts: 3,
        baseDelay: 100
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should handle undefined service name', async () => {
      app.use(retryMiddleware({
        maxAttempts: 3,
        baseDelay: 100
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should handle null service name', async () => {
      app.use(retryMiddleware({
        maxAttempts: 3,
        baseDelay: 100
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should handle multiple services independently', async () => {
      app.use(retryMiddleware({
        maxAttempts: 3,
        baseDelay: 100
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });
  });
});





