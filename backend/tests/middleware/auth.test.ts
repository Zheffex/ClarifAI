import request from 'supertest';
import express from 'express';
import { authenticate, optionalAuth, generateToken, verifyToken, extractToken, refreshToken } from '../../src/middleware/auth';
import { User } from '../../src/models/User';
import { errorHandler } from '../../src/middleware/errorHandler';
import jwt from 'jsonwebtoken';

// Mock the User model
jest.mock('../../src/models/User');

describe('Auth Middleware', () => {
  let app: express.Application;
  let testUser: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    testUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'analyst',
      isActive: true,
      isEmailVerified: true
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Add error handler after each test setup
    app.use(errorHandler);
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const mockUser = { 
        ...testUser,
        save: jest.fn().mockResolvedValue(testUser)
      };
      
      // Mock the User.findById().select() chain
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };
      (User.findById as jest.Mock).mockReturnValue(mockQuery);

      app.get('/protected', authenticate, (req: any, res: any) => {
        res.json({ success: true, user: req.user });
      });

      const token = generateToken(testUser);
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    it('should reject request without token', async () => {
      app.get('/protected', authenticate, (req: any, res: any) => {
        res.json({ success: true });
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      app.get('/protected', authenticate, (req: any, res: any) => {
        res.json({ success: true });
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      app.get('/protected', authenticate, (req: any, res: any) => {
        res.json({ success: true });
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject token for non-existent user', async () => {
      // Mock the User.findById().select() chain
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null)
      };
      (User.findById as jest.Mock).mockReturnValue(mockQuery);

      app.get('/protected', authenticate, (req: any, res: any) => {
        res.json({ success: true });
      });
      app.use(errorHandler);

      const token = generateToken(testUser);
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject token for inactive user', async () => {
      const inactiveUser = { 
        ...testUser, 
        isActive: false,
        save: jest.fn().mockResolvedValue(testUser)
      };
      
      // Mock the User.findById().select() chain
      const mockQuery = {
        select: jest.fn().mockResolvedValue(inactiveUser)
      };
      (User.findById as jest.Mock).mockReturnValue(mockQuery);

      app.get('/protected', authenticate, (req: any, res: any) => {
        res.json({ success: true });
      });
      app.use(errorHandler);

      const token = generateToken(testUser);
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate valid token', async () => {
      const mockUser = { ...testUser };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      app.get('/optional', optionalAuth, (req: any, res: any) => {
        res.json({ success: true, user: req.user });
      });

      const token = generateToken(testUser);
      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    it('should allow request without token', async () => {
      app.get('/optional', optionalAuth, (req: any, res: any) => {
        res.json({ success: true, user: req.user });
      });

      const response = await request(app)
        .get('/optional');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeUndefined();
    });

    it('should ignore invalid token', async () => {
      app.get('/optional', optionalAuth, (req: any, res: any) => {
        res.json({ success: true, user: req.user });
      });

      const response = await request(app)
        .get('/optional')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeUndefined();
    });
  });

  describe('generateToken', () => {
    it('should generate valid token', () => {
      const token = generateToken(testUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(testUser._id);
    });

    it('should include user role in token', () => {
      const token = generateToken(testUser);
      const decoded = verifyToken(token);
      
      expect(decoded.role).toBe(testUser.role);
    });

    it('should include user email in token', () => {
      const token = generateToken(testUser);
      const decoded = verifyToken(token);
      
      expect(decoded.email).toBe(testUser.email);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = generateToken(testUser);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(testUser._id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyToken('not.a.valid.jwt')).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => verifyToken('')).toThrow();
    });
  });

  describe('extractToken', () => {
    it('should extract token from Authorization header', () => {
      const token = generateToken(testUser);
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      } as any;

      const extractedToken = extractToken(req);
      expect(extractedToken).toBe(token);
    });

    it('should return null when no Authorization header', () => {
      const req = {
        headers: {}
      } as any;

      const extractedToken = extractToken(req);
      expect(extractedToken).toBeNull();
    });

    it('should return null for malformed Authorization header', () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat'
        }
      } as any;

      const extractedToken = extractToken(req);
      expect(extractedToken).toBeNull();
    });

    it('should handle case-insensitive Authorization header', () => {
      const token = generateToken(testUser);
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      } as any;

      const extractedToken = extractToken(req);
      expect(extractedToken).toBe(token);
    });
  });

  describe('refreshToken', () => {
    it('should refresh valid token', async () => {
      const mockUser = { ...testUser };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      app.post('/refresh', refreshToken);

      const token = generateToken(testUser);
      const response = await request(app)
        .post('/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject refresh without token', async () => {
      app.post('/refresh', refreshToken);
      app.use(errorHandler);

      const response = await request(app)
        .post('/refresh');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject refresh for non-existent user', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      app.post('/refresh', refreshToken);
      app.use(errorHandler);

      const token = generateToken(testUser);
      const response = await request(app)
        .post('/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});