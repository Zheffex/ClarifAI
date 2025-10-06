import request from 'supertest';
import express, { Request, Response } from 'express';
import { 
  sanitizeInput, 
  handleValidationErrors, 
  validateObjectId, 
  validateEmail, 
  validatePassword, 
  validateFileUpload, 
  validatePagination, 
  validateSearch, 
  validateDateRange, 
  validateJSON, 
  validateUUID, 
  validateURL, 
  validatePhoneNumber, 
  validateRole, 
  validateFileMetadata, 
  validateApiKey, 
  validateIPAddress, 
  validateTimezone, 
  validateColorCode, 
  validateCoordinates, 
  validateRateLimit, 
  createValidationMiddleware, 
  commonValidations, 
  dynamicValidation, 
  validateRequestSize 
} from '../../src/middleware/validation';
import { errorHandler } from '../../src/middleware/errorHandler';
import { body, validationResult } from 'express-validator';

describe('Validation Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  const setupAppWithErrorHandler = (route: string, method: 'get' | 'post', ...middleware: any[]) => {
    app[method](route, ...middleware, (req: Request, res: Response) => {
      res.json({ success: true });
    });
    app.use(errorHandler);
  };

  describe('sanitizeInput', () => {
    it('should sanitize malicious input', async () => {
      app.post('/test', sanitizeInput, (req: Request, res: Response) => {
        res.json({ data: req.body });
      });

      const response = await request(app)
        .post('/test')
        .send({
          name: '<script>alert("xss")</script>John',
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).not.toContain('<script>');
      expect(response.body.data.name).toBe('John');
    });

    it('should handle nested objects', async () => {
      app.post('/test', sanitizeInput, (req: Request, res: Response) => {
        res.json({ data: req.body });
      });

      const response = await request(app)
        .post('/test')
        .send({
          user: {
            name: '<script>alert("xss")</script>John',
            profile: {
              bio: 'javascript:alert("xss")'
            }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.name).not.toContain('<script>');
      expect(response.body.data.user.profile.bio).not.toContain('javascript:');
    });
  });

  describe('handleValidationErrors', () => {
    it('should handle validation errors', async () => {
      app.post('/test', 
        body('email').isEmail(),
        body('age').isInt({ min: 0 }),
        handleValidationErrors,
        (req: Request, res: Response) => {
          res.json({ success: true });
        }
      );
      app.use(errorHandler);

      const response = await request(app)
        .post('/test')
        .send({
          email: 'invalid-email',
          age: -5
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should pass valid data', async () => {
      app.post('/test', 
        body('email').isEmail(),
        body('age').isInt({ min: 0 }),
        handleValidationErrors,
        (req: Request, res: Response) => {
          res.json({ success: true });
        }
      );

      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          age: 25
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('validateObjectId', () => {
    it('should validate MongoDB ObjectId', async () => {
      app.get('/test/:id', validateObjectId('id'), handleValidationErrors, (req: Request, res: Response) => {
        res.json({ success: true, id: req.params.id });
      });

      const response = await request(app)
        .get('/test/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid ObjectId', async () => {
      setupAppWithErrorHandler('/test/:id', 'get', validateObjectId('id'), handleValidationErrors);

      const response = await request(app)
        .get('/test/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate email format', async () => {
      app.post('/test', validateEmail('email'), handleValidationErrors, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid email', async () => {
      setupAppWithErrorHandler('/test', 'post', validateEmail('email'), handleValidationErrors);

      const response = await request(app)
        .post('/test')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate password strength', async () => {
      app.post('/test', validatePassword('password'), handleValidationErrors, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ password: 'StrongPass123!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject weak password', async () => {
      setupAppWithErrorHandler('/test', 'post', validatePassword('password'), handleValidationErrors);

      const response = await request(app)
        .post('/test')
        .send({ password: '123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validatePagination', () => {
    it('should validate pagination parameters', async () => {
      app.get('/test', validatePagination(), handleValidationErrors, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid pagination', async () => {
      setupAppWithErrorHandler('/test', 'get', validatePagination(), handleValidationErrors);

      const response = await request(app)
        .get('/test?page=-1&limit=0');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateSearch', () => {
    it('should validate search parameters', async () => {
      app.get('/test', validateSearch(), handleValidationErrors, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test?q=test&sort=name&order=asc');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('validateDateRange', () => {
    it('should validate date range', async () => {
      app.get('/test', validateDateRange(), handleValidationErrors, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test?startDate=2023-01-01&endDate=2023-12-31');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid date range', async () => {
      setupAppWithErrorHandler('/test', 'post', validateDateRange(), handleValidationErrors);

      const response = await request(app)
        .post('/test')
        .send({ startDate: 'invalid', endDate: '2023-12-31' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateJSON', () => {
    it('should validate JSON data', async () => {
      setupAppWithErrorHandler('/test', 'post', validateJSON('data'), handleValidationErrors);

      const response = await request(app)
        .post('/test')
        .send({ data: JSON.stringify({ name: 'John', age: 30 }) });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('validateUUID', () => {
    it('should validate UUID format', async () => {
      app.get('/test/:id', validateUUID('id'), handleValidationErrors, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid UUID', async () => {
      setupAppWithErrorHandler('/test/:id', 'get', validateUUID('id'), handleValidationErrors);

      const response = await request(app)
        .get('/test/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateURL', () => {
    it('should validate URL format', async () => {
      app.post('/test', validateURL('url'), handleValidationErrors, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid URL', async () => {
      setupAppWithErrorHandler('/test', 'post', validateURL('url'), handleValidationErrors);

      const response = await request(app)
        .post('/test')
        .send({ url: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate phone number', async () => {
      app.post('/test', validatePhoneNumber('phone'), handleValidationErrors, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ phone: '+1234567890' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid phone number', async () => {
      setupAppWithErrorHandler('/test', 'post', validatePhoneNumber('phone'), handleValidationErrors);

      const response = await request(app)
        .post('/test')
        .send({ phone: '123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateRole', () => {
    it('should validate allowed roles', async () => {
      app.post('/test', validateRole(['admin', 'user']), handleValidationErrors, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid role', async () => {
      setupAppWithErrorHandler('/test', 'post', validateRole(['admin', 'user']), handleValidationErrors);

      const response = await request(app)
        .post('/test')
        .send({ role: 'guest' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('createValidationMiddleware', () => {
    it('should create validation middleware', async () => {
      const validation = createValidationMiddleware([
        body('email').isEmail(),
        body('name').isLength({ min: 1 })
      ]);

      app.post('/test', validation, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ email: 'test@example.com', name: 'John' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('validateRequestSize', () => {
    it('should validate request size', async () => {
      app.use(validateRequestSize(1)); // 1MB limit
      app.post('/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ data: 'small data' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('commonValidations', () => {
    it('should provide common validation rules', () => {
      expect(commonValidations).toBeDefined();
      expect(commonValidations.userRegistration).toBeDefined();
      expect(commonValidations.userLogin).toBeDefined();
      expect(commonValidations.passwordChange).toBeDefined();
      expect(commonValidations.fileUpload).toBeDefined();
      expect(commonValidations.pagination).toBeDefined();
      expect(commonValidations.search).toBeDefined();
      expect(commonValidations.dateRange).toBeDefined();
    });
  });

  describe('dynamicValidation', () => {
    it('should handle dynamic validation', async () => {
      app.post('/test', dynamicValidation, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
