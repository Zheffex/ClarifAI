import request from 'supertest';
import express from 'express';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('errorHandler', () => {
    it('should handle generic errors', async () => {
      app.get('/error', (req, res, next) => {
        throw new Error('Generic error');
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/error');

      expect(response.status).toBe(500);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('Generic error');
      expect(response.body.error.userMessage).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed') as any;
      validationError.name = 'ValidationError';
      validationError.details = [{ field: 'email', message: 'Invalid email format' }];

      app.get('/validation-error', (req, res, next) => {
        throw validationError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/validation-error');

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid credentials');
      authError.name = 'AuthenticationError';

      app.get('/auth-error', (req, res, next) => {
        throw authError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/auth-error');

      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should handle authorization errors', async () => {
      const authError = new Error('Insufficient permissions');
      authError.name = 'AuthorizationError';

      app.get('/authz-error', (req, res, next) => {
        throw authError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/authz-error');

      expect(response.status).toBe(403);
      expect(response.body.error.type).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.error.message).toBe('Insufficient permissions');
    });

    it('should handle not found errors', async () => {
      const notFoundError = new Error('Resource not found');
      notFoundError.name = 'NotFoundError';

      app.get('/not-found-error', (req, res, next) => {
        throw notFoundError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/not-found-error');

      expect(response.status).toBe(404);
      expect(response.body.error.type).toBe('RECORD_NOT_FOUND');
      expect(response.body.error.message).toBe('Resource not found');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Too many requests');
      rateLimitError.name = 'RateLimitError';

      app.get('/rate-limit-error', (req, res, next) => {
        throw rateLimitError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/rate-limit-error');

      expect(response.status).toBe(429);
      expect(response.body.error.type).toBe('API_RATE_LIMIT');
      expect(response.body.error.message).toBe('Too many requests');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      dbError.name = 'MongoError';

      app.get('/db-error', (req, res, next) => {
        throw dbError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/db-error');

      expect(response.status).toBe(500);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('Database connection failed');
    });

    it('should handle JWT errors', async () => {
      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';

      app.get('/jwt-error', (req, res, next) => {
        throw jwtError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/jwt-error');

      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('AUTHENTICATION_REQUIRED');
      expect(response.body.error.message).toBe('Invalid token provided');
    });

    it('should handle JWT expired errors', async () => {
      const jwtError = new Error('Token expired');
      jwtError.name = 'TokenExpiredError';

      app.get('/jwt-expired-error', (req, res, next) => {
        throw jwtError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/jwt-expired-error');

      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('TOKEN_EXPIRED');
      expect(response.body.error.message).toBe('Token has expired');
    });

    it('should handle multer errors', async () => {
      const multerError = new Error('File too large') as any;
      multerError.name = 'MulterError';
      multerError.code = 'LIMIT_FILE_SIZE';

      app.get('/multer-error', (req, res, next) => {
        throw multerError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/multer-error');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should handle syntax errors', async () => {
      const syntaxError = new SyntaxError('Unexpected token in JSON');
      syntaxError.name = 'SyntaxError';

      app.get('/syntax-error', (req, res, next) => {
        throw syntaxError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/syntax-error');

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('INVALID_INPUT');
      expect(response.body.error.message).toBe('Unexpected token in JSON');
    });

    it('should handle type errors', async () => {
      const typeError = new TypeError('Cannot read property of undefined');
      typeError.name = 'TypeError';

      app.get('/type-error', (req, res, next) => {
        throw typeError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/type-error');

      expect(response.status).toBe(500);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('Cannot read property of undefined');
    });

    it('should handle reference errors', async () => {
      const referenceError = new ReferenceError('Variable is not defined');
      referenceError.name = 'ReferenceError';

      app.get('/reference-error', (req, res, next) => {
        throw referenceError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/reference-error');

      expect(response.status).toBe(500);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('Variable is not defined');
    });

    it('should handle range errors', async () => {
      const rangeError = new RangeError('Invalid array length');
      rangeError.name = 'RangeError';

      app.get('/range-error', (req, res, next) => {
        throw rangeError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/range-error');

      expect(response.status).toBe(500);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('Invalid array length');
    });

    it('should handle URI errors', async () => {
      const uriError = new URIError('URI malformed');
      uriError.name = 'URIError';

      app.get('/uri-error', (req, res, next) => {
        throw uriError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/uri-error');

      expect(response.status).toBe(500);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('URI malformed');
    });

    it('should handle eval errors', async () => {
      const evalError = new EvalError('Eval error');
      evalError.name = 'EvalError';

      app.get('/eval-error', (req, res, next) => {
        throw evalError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/eval-error');

      expect(response.status).toBe(500);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('Eval error');
    });

    it('should handle unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      unknownError.name = 'UnknownError';

      app.get('/unknown-error', (req, res, next) => {
        throw unknownError;
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/unknown-error');

      expect(response.status).toBe(500);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('Unknown error');
    });

    it('should include stack trace in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.get('/dev-error', (req, res, next) => {
        throw new Error('Development error');
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/dev-error');

      expect(response.status).toBe(500);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('Development error');
      expect(response.body.error.stack).toBeDefined();
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production', async () => {
      process.env.NODE_ENV = 'production';

      app.get('/prod-error', (req, res, next) => {
        throw new Error('Production error');
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/prod-error');

      expect(response.status).toBe(500);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('Production error');
      expect(response.body.error.stack).toBeUndefined();
    });
  });

  describe('notFoundHandler', () => {
    it('should handle 404 errors', async () => {
      app.use(notFoundHandler);
      app.use(errorHandler);

      const response = await request(app)
        .get('/nonexistent-route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });

});
