import request from 'supertest';
import express from 'express';
import advancedRateLimitService, { userRateLimiters, endpointLimiters } from '../../src/middleware/advancedRateLimit';
import rateLimit from 'express-rate-limit';

describe('Rate Limit Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      app.use(rateLimit({ windowMs: 1000, max: 5 }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    });

    it('should block requests exceeding limit', async () => {
      app.use(rateLimit({ 
        windowMs: 1000, 
        max: 2,
        message: 'Too Many Requests'
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // Make requests within limit
      await request(app).get('/test');
      await request(app).get('/test');

      // This should be blocked
      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(429);
      expect(response.text).toContain('Too Many Requests');
    });

    it('should reset limit after window expires', async () => {
      app.use(rateLimit({ 
        windowMs: 100, 
        max: 1,
        message: 'Too Many Requests'
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // Make first request - should succeed
      const firstResponse = await request(app).get('/test');
      expect(firstResponse.status).toBe(200);

      // Second request should be blocked
      const blockedResponse = await request(app)
        .get('/test');
      expect(blockedResponse.status).toBe(429);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150));

      // This should work again
      const response = await request(app)
        .get('/test');
      expect(response.status).toBe(200);
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should track rate limits per IP', async () => {
      app.use(rateLimit({ windowMs: 1000, max: 2 }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // Make requests from same IP
      await request(app).get('/test');
      await request(app).get('/test');

      // This should be blocked
      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(429);
    });

    it('should allow different IPs to have separate limits', async () => {
      app.use(rateLimit({ 
        windowMs: 1000, 
        max: 2,
        keyGenerator: (req: any) => {
          // Use X-Forwarded-For header to simulate different IPs
          return req.headers['x-forwarded-for'] || req.ip;
        }
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // Make requests from first IP
      await request(app).get('/test');
      await request(app).get('/test');

      // This should be blocked for first IP
      const blockedResponse = await request(app)
        .get('/test');
      expect(blockedResponse.status).toBe(429);

      // Make request from different IP (simulated by X-Forwarded-For header)
      const response = await request(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.2');

      expect(response.status).toBe(200);
    });
  });

  describe('Custom Key Function', () => {
    it('should use custom key function for rate limiting', async () => {
      app.use(rateLimit({
        windowMs: 1000,
        max: 2,
        keyGenerator: (req: any) => req.headers['user-id'] || req.ip
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // Make requests with same user ID
      await request(app).get('/test').set('user-id', 'user1');
      await request(app).get('/test').set('user-id', 'user1');

      // This should be blocked for user1
      const blockedResponse = await request(app)
        .get('/test')
        .set('user-id', 'user1');
      expect(blockedResponse.status).toBe(429);

      // This should work for user2
      const response = await request(app)
        .get('/test')
        .set('user-id', 'user2');
      expect(response.status).toBe(200);
    });
  });

  describe('Custom Skip Function', () => {
    it('should skip rate limiting for certain conditions', async () => {
      app.use(rateLimit({
        windowMs: 1000,
        max: 2,
        skip: (req: any) => req.headers['x-skip-rate-limit'] === 'true'
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // Make requests with skip header
      await request(app).get('/test').set('x-skip-rate-limit', 'true');
      await request(app).get('/test').set('x-skip-rate-limit', 'true');
      await request(app).get('/test').set('x-skip-rate-limit', 'true');

      // All should succeed
      const response = await request(app)
        .get('/test')
        .set('x-skip-rate-limit', 'true');
      expect(response.status).toBe(200);
    });
  });

  describe('Custom Handler', () => {
    it('should use custom handler for rate limit exceeded', async () => {
      app.use(rateLimit({
        windowMs: 1000,
        max: 2,
        handler: (req: any, res: any) => {
          res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: 1
          });
        }
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // Make requests within limit
      await request(app).get('/test');
      await request(app).get('/test');

      // This should be blocked with custom handler
      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Rate limit exceeded');
      expect(response.body.retryAfter).toBe(1);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in response', async () => {
      app.use(rateLimit({ windowMs: 1000, max: 5 }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBe('5');
      expect(response.headers['x-ratelimit-remaining']).toBe('4');
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should update remaining count on each request', async () => {
      app.use(rateLimit({ windowMs: 1000, max: 3 }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response1 = await request(app).get('/test');
      expect(response1.headers['x-ratelimit-remaining']).toBe('2');

      const response2 = await request(app).get('/test');
      expect(response2.headers['x-ratelimit-remaining']).toBe('1');

      const response3 = await request(app).get('/test');
      expect(response3.headers['x-ratelimit-remaining']).toBe('0');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in key generator', async () => {
      app.use(rateLimit({
        windowMs: 1000,
        max: 2,
        keyGenerator: () => {
          throw new Error('Key generator error');
        }
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(500);
    });

    it('should handle errors in skip function', async () => {
      app.use(rateLimit({
        windowMs: 1000,
        max: 2,
        skip: () => {
          throw new Error('Skip function error');
        }
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(500);
    });

    it('should handle errors in handler function', async () => {
      app.use(rateLimit({
        windowMs: 1000,
        max: 1,
        handler: () => {
          throw new Error('Handler error');
        }
      }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      // Make first request
      await request(app).get('/test');

      // Second request should trigger handler error
      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero max requests', async () => {
      app.use(rateLimit({ windowMs: 1000, max: 0 }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(429);
    });

    it('should handle very small window', async () => {
      app.use(rateLimit({ windowMs: 1, max: 1 }));
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });

    it('should handle very large window', async () => {
      app.use(rateLimit({ windowMs: 86400000, max: 1 })); // 24 hours
      app.get('/test', (req, res) => {
        res.json({ message: 'Success' });
      });

      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
    });
  });
});
