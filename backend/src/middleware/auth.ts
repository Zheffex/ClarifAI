import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AppError } from './errorHandler';
import { logger } from '../config/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
    }
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      throw new AppError('Access token is required', 401);
    }

    // Verify token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      logger.error('JWT_SECRET is not configured');
      throw new AppError('Server configuration error', 500);
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('+passwordHash');
    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account has been deactivated', 401);
    }

    // Update last activity
    user.lastLogin = new Date();
    await user.save();

    // Attach user to request
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (JWT_SECRET) {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive) {
          req.user = user;
          req.userId = user._id.toString();
        }
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just proceed without user
    next();
  }
};

// Generate JWT token
export const generateToken = (user: IUser): string => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE } as jwt.SignOptions);
};

// Verify token utility function
export const verifyToken = (token: string): JWTPayload => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

// Extract token from request
export const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
};

// Refresh token middleware (for future use)
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError('Refresh token is required', 401);
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Generate new token
    const newToken = generateToken(user);
    
    res.json({
      success: true,
      data: {
        token: newToken,
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          preferences: user.preferences
        }
      }
    });
  } catch (error) {
    next(error);
  }
};