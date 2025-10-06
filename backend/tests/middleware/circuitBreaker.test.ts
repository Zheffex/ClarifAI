import request from 'supertest';
import express from 'express';
import { 
  circuitBreakerMiddleware,
  circuitBreakerManager,
  withCircuitBreaker,
  getCircuitBreakerHealth,
  getCircuitBreakerStatus,
  resetCircuitBreaker,
  CircuitState
} from '../../src/middleware/circuitBreaker';

describe('Circuit Breaker Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Basic Circuit Breaker Functionality', () => {
    it('should allow requests when circuit is closed', async () => {
      app.use(circuitBreakerMiddleware('test-service'));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    });

    it('should handle successful requests', async () => {
      app.use(circuitBreakerMiddleware('test-service'));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    });

    it('should handle error responses', async () => {
      app.use(circuitBreakerMiddleware('test-service'));
      app.get('/test', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal Server Error');
    });
  });

  describe('Circuit Breaker Manager', () => {
    it('should get circuit breaker status via manager', () => {
      const breaker = circuitBreakerManager.getBreaker('test-service');
      const state = breaker.getState();
      
      expect(state).toBeDefined();
      expect([CircuitState.CLOSED, CircuitState.OPEN, CircuitState.HALF_OPEN]).toContain(state);
    });

    it('should get circuit breaker health', () => {
      const health = getCircuitBreakerHealth();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('services');
      expect(health.healthy).toBe(true);
      expect(health.services).toHaveProperty('test-service');
    });

    it('should reset circuit breaker', () => {
      resetCircuitBreaker('test-service');
      
      const breaker = circuitBreakerManager.getBreaker('test-service');
      const state = breaker.getState();
      expect(state).toBe(CircuitState.CLOSED);
    });
  });

  describe('Circuit Breaker Execution', () => {
    it('should execute function with circuit breaker', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreakerManager.execute('test-service', mockFunction);

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should handle function errors', async () => {
      const mockFunction = jest.fn().mockRejectedValue(new Error('Function error'));
      
      await expect(circuitBreakerManager.execute('test-service', mockFunction))
        .rejects.toThrow('Function error');
    });

    it('should handle function with custom config', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreakerManager.execute('test-service', mockFunction, {
        failureThreshold: 5,
        timeout: 2000
      });

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });
  });

  describe('Circuit States', () => {
    it('should have correct circuit state values', () => {
      expect(CircuitState.CLOSED).toBe('CLOSED');
      expect(CircuitState.OPEN).toBe('OPEN');
      expect(CircuitState.HALF_OPEN).toBe('HALF_OPEN');
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Mock circuitBreakerManager to throw error
      const originalGetBreaker = circuitBreakerManager.getBreaker;
      circuitBreakerManager.getBreaker = jest.fn().mockImplementation(() => {
        throw new Error('Circuit breaker error');
      });

      app.use(circuitBreakerMiddleware('test-service'));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // Add error handler
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Circuit breaker error');

      // Restore original method
      circuitBreakerManager.getBreaker = originalGetBreaker;
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', async () => {
      app.use(circuitBreakerMiddleware('test-service', {
        failureThreshold: 5,
        timeout: 2000,
        resetTimeout: 10000
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
      app.use(circuitBreakerMiddleware('test-service'));
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
      app.use(circuitBreakerMiddleware(''));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should handle undefined service name', async () => {
      app.use(circuitBreakerMiddleware(undefined as any));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should handle null service name', async () => {
      app.use(circuitBreakerMiddleware(null as any));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should handle multiple services independently', async () => {
      app.use(circuitBreakerMiddleware('service1'));
      app.use(circuitBreakerMiddleware('service2'));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });
  });
});