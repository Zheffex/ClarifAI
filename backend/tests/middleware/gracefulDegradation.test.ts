import request from 'supertest';
import express from 'express';
import { 
  gracefulDegradationMiddleware, 
  gracefulDegradationManager,
  withGracefulDegradation,
  getServiceHealth,
  markServiceDegraded,
  recoverService,
  clearServiceCache,
  featureFlagManager,
  withFeatureFlag,
  ServicePriority,
  FallbackStrategy
} from '../../src/middleware/gracefulDegradation';

describe('Graceful Degradation Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Clear any existing service states
    clearServiceCache();
  });

  describe('gracefulDegradationMiddleware', () => {
    it('should add service status headers for healthy service', async () => {
      app.use(gracefulDegradationMiddleware('test-service'));
      
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-service-status']).toBeUndefined();
      expect(response.headers['x-service-name']).toBeUndefined();
    });

    it('should add degraded service headers when service is degraded', async () => {
      // Mark service as degraded
      markServiceDegraded('test-service');
      
      app.use(gracefulDegradationMiddleware('test-service'));
      
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-service-status']).toBe('degraded');
      expect(response.headers['x-service-name']).toBe('test-service');
    });

    it('should handle service recovery', async () => {
      // Mark service as degraded first
      markServiceDegraded('test-service');
      
      // Then recover it
      recoverService('test-service');
      
      app.use(gracefulDegradationMiddleware('test-service'));
      
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-service-status']).toBeUndefined();
      expect(response.headers['x-service-name']).toBeUndefined();
    });

    it('should pass through errors to next middleware', async () => {
      app.use(gracefulDegradationMiddleware('test-service'));
      
      app.get('/test', (req: any, res: any) => {
        throw new Error('Service error');
      });

      // Add error handler
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service error');
    });

    it('should handle middleware errors gracefully', async () => {
      // Mock gracefulDegradationManager to throw error
      const originalGetServiceStatus = gracefulDegradationManager.getServiceStatus;
      gracefulDegradationManager.getServiceStatus = jest.fn().mockImplementation(() => {
        throw new Error('Status check error');
      });

      app.use(gracefulDegradationMiddleware('test-service'));
      
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'Success' });
      });

      // Add error handler
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Status check error');

      // Restore original method
      gracefulDegradationManager.getServiceStatus = originalGetServiceStatus;
    });
  });

  describe('withGracefulDegradation', () => {
    it('should execute function with graceful degradation', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await withGracefulDegradation(
        'ai',
        mockFunction,
        { userId: 'test-user' }
      );

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should return fallback when service is degraded', async () => {
      // Mark service as degraded
      markServiceDegraded('ai');
      
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await withGracefulDegradation(
        'ai',
        mockFunction,
        { userId: 'test-user' }
      );

      expect(result).toEqual({ message: 'AI service temporarily unavailable' });
      expect(mockFunction).not.toHaveBeenCalled();
    });

    it('should execute function when service recovers', async () => {
      // Mark service as degraded first
      markServiceDegraded('ai');
      
      // Then recover it
      recoverService('ai');
      
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await withGracefulDegradation(
        'ai',
        mockFunction,
        { userId: 'test-user' }
      );

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should handle function errors gracefully', async () => {
      const mockFunction = jest.fn().mockRejectedValue(new Error('Function error'));
      
      const result = await withGracefulDegradation(
        'ai',
        mockFunction,
        { userId: 'test-user' }
      );

      expect(result).toEqual({ message: 'AI service temporarily unavailable' });
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should use custom context', async () => {
      // Ensure service is not degraded
      recoverService('ai');
      
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await withGracefulDegradation(
        'ai',
        mockFunction,
        { userId: 'test-user', requestId: 'req-123' }
      );

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });
  });

  describe('Service Health Management', () => {
    it('should get service health status via manager', () => {
      const health = gracefulDegradationManager.getServiceStatus('ai');
      
      expect(health).toHaveProperty('degraded');
      expect(health).toHaveProperty('config');
      expect(health).toHaveProperty('queueSize');
    });

    it('should mark service as degraded', () => {
      markServiceDegraded('ai');
      
      const health = gracefulDegradationManager.getServiceStatus('ai');
      expect(health.degraded).toBe(true);
    });

    it('should recover service', () => {
      markServiceDegraded('ai');
      recoverService('ai');
      
      const health = gracefulDegradationManager.getServiceStatus('ai');
      expect(health.degraded).toBe(false);
    });

    it('should clear service cache', () => {
      markServiceDegraded('ai');
      clearServiceCache();
      
      const health = gracefulDegradationManager.getServiceStatus('ai');
      expect(health.degraded).toBe(true); // clearServiceCache doesn't clear degraded status
    });
  });

  describe('Feature Flag Management', () => {
    it('should check feature flag status', () => {
      const status = featureFlagManager.isFeatureEnabled('test-feature');
      expect(typeof status).toBe('boolean');
    });

    it('should enable feature flag', () => {
      featureFlagManager.setFeatureFlag('test-feature', true);
      const status = featureFlagManager.isFeatureEnabled('test-feature');
      expect(status).toBe(true);
    });

    it('should disable feature flag', () => {
      featureFlagManager.setFeatureFlag('test-feature', false);
      const status = featureFlagManager.isFeatureEnabled('test-feature');
      expect(status).toBe(false);
    });

    it('should toggle feature flag', () => {
      featureFlagManager.setFeatureFlag('test-feature', true);
      featureFlagManager.setFeatureFlag('test-feature', false);
      const status = featureFlagManager.isFeatureEnabled('test-feature');
      expect(status).toBe(false);
    });
  });

  describe('withFeatureFlag', () => {
    it('should execute function when feature is enabled', async () => {
      featureFlagManager.setFeatureFlag('test-feature', true);
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await withFeatureFlag('test-feature', mockFunction);
      
      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    it('should not execute function when feature is disabled', async () => {
      featureFlagManager.setFeatureFlag('test-feature', false);
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      await expect(withFeatureFlag('test-feature', mockFunction))
        .rejects.toThrow('Feature test-feature is disabled');
      expect(mockFunction).not.toHaveBeenCalled();
    });

    it('should use fallback when feature is disabled', async () => {
      featureFlagManager.setFeatureFlag('test-feature', false);
      const mockFunction = jest.fn().mockResolvedValue('success');
      const fallbackFunction = jest.fn().mockResolvedValue('fallback');
      
      const result = await withFeatureFlag('test-feature', mockFunction, fallbackFunction);
      
      expect(result).toBe('fallback');
      expect(mockFunction).not.toHaveBeenCalled();
      expect(fallbackFunction).toHaveBeenCalled();
    });
  });

  describe('Service Priority and Fallback Strategy', () => {
    it('should have correct service priority values', () => {
      expect(ServicePriority.CRITICAL).toBe('CRITICAL');
      expect(ServicePriority.HIGH).toBe('HIGH');
      expect(ServicePriority.MEDIUM).toBe('MEDIUM');
      expect(ServicePriority.LOW).toBe('LOW');
      expect(ServicePriority.OPTIONAL).toBe('OPTIONAL');
    });

    it('should have correct fallback strategy values', () => {
      expect(FallbackStrategy.CACHE).toBe('CACHE');
      expect(FallbackStrategy.DEFAULT).toBe('DEFAULT');
      expect(FallbackStrategy.DISABLE).toBe('DISABLE');
      expect(FallbackStrategy.REDIRECT).toBe('REDIRECT');
      expect(FallbackStrategy.QUEUE).toBe('QUEUE');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty service name', async () => {
      app.use(gracefulDegradationMiddleware(''));
      
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should handle undefined service name', async () => {
      app.use(gracefulDegradationMiddleware(undefined as any));
      
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should handle null service name', async () => {
      app.use(gracefulDegradationMiddleware(null as any));
      
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should handle multiple services independently', async () => {
      app.use(gracefulDegradationMiddleware('service1'));
      app.use(gracefulDegradationMiddleware('service2'));
      
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should show degraded status for specific service only', async () => {
      // Mark only service1 as degraded
      markServiceDegraded('service1');
      
      app.use(gracefulDegradationMiddleware('service1'));
      app.use(gracefulDegradationMiddleware('service2'));
      
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      // Should show degraded status for service1
      expect(response.headers['x-service-status']).toBe('degraded');
      expect(response.headers['x-service-name']).toBe('service1');
    });
  });
});