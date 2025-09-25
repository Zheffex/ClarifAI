import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { IUser } from '../models/User';
import { AppError } from './errorHandler';
import { logger } from '../config/logger';
import { env } from '../config/environment';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

interface UserTier {
  name: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  concurrentRequests: number;
  dataUploadMB: number;
  fileUploadSize: number;
}

class AdvancedRateLimitService {
  private redis?: Redis;
  private isRedisConnected: boolean = false;

  // User tier configurations
  private userTiers: Record<string, UserTier> = {
    viewer: {
      name: 'Viewer',
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      concurrentRequests: 5,
      dataUploadMB: 10,
      fileUploadSize: 10 * 1024 * 1024 // 10MB
    },
    analyst: {
      name: 'Analyst',
      requestsPerMinute: 120,
      requestsPerHour: 3000,
      requestsPerDay: 50000,
      concurrentRequests: 15,
      dataUploadMB: 100,
      fileUploadSize: 100 * 1024 * 1024 // 100MB
    },
    admin: {
      name: 'Admin',
      requestsPerMinute: 300,
      requestsPerHour: 10000,
      requestsPerDay: 200000,
      concurrentRequests: 50,
      dataUploadMB: 1000,
      fileUploadSize: 1000 * 1024 * 1024 // 1GB
    }
  };

  // Organization tier multipliers
  private orgTierMultipliers: Record<string, number> = {
    free: 1,
    pro: 3,
    enterprise: 10
  };

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      // Redis is optional - using in-memory fallback if not configured
      logger.warn('Redis not configured - using in-memory rate limiting');
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.isRedisConnected = false;
    }
  }

  // Generate rate limit key for user/organization
  private generateKey(type: string, userId: string, organizationId?: string, endpoint?: string): string {
    const baseKey = `ratelimit:${type}:`;
    if (organizationId) {
      return `${baseKey}org:${organizationId}:user:${userId}${endpoint ? `:${endpoint}` : ''}`;
    }
    return `${baseKey}user:${userId}${endpoint ? `:${endpoint}` : ''}`;
  }

  // Get organization multiplier
  private getOrgMultiplier(organizationTier: string = 'free'): number {
    return this.orgTierMultipliers[organizationTier] || 1;
  }

  // Calculate effective limits based on user and organization tier
  private calculateLimits(user: IUser, organizationTier: string = 'free'): UserTier {
    const baseTier = this.getUserTier(user);
    const multiplier = this.getOrgMultiplier(organizationTier);

    return {
      ...baseTier,
      requestsPerMinute: Math.floor(baseTier.requestsPerMinute * multiplier),
      requestsPerHour: Math.floor(baseTier.requestsPerHour * multiplier),
      requestsPerDay: Math.floor(baseTier.requestsPerDay * multiplier),
      concurrentRequests: Math.floor(baseTier.concurrentRequests * multiplier),
      dataUploadMB: Math.floor(baseTier.dataUploadMB * multiplier),
      fileUploadSize: Math.floor(baseTier.fileUploadSize * multiplier)
    };
  }

  // Get user tier configuration
  private getUserTier(user: IUser): UserTier {
    const userTier = this.userTiers[user.role];
    const defaultTier = this.userTiers.viewer;
    return userTier || defaultTier || {
      name: 'Default',
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 5000,
      concurrentRequests: 3,
      dataUploadMB: 5,
      fileUploadSize: 5 * 1024 * 1024
    };
  }

  // Create user-specific rate limiter
  createUserRateLimiter(windowMs: number, limitType: 'minute' | 'hour' | 'day' = 'minute'): any {
    return rateLimit({
      windowMs,
      max: async (req: Request): Promise<number> => {
        const user = req.user as IUser;
        if (!user) return 10; // Default for unauthenticated users

        const limits = this.calculateLimits(user, 'free'); // TODO: Get actual org tier
        
        switch (limitType) {
          case 'minute':
            return limits.requestsPerMinute;
          case 'hour':
            return limits.requestsPerHour;
          case 'day':
            return limits.requestsPerDay;
          default:
            return limits.requestsPerMinute;
        }
      },
      keyGenerator: (req: Request): string => {
        const user = req.user as IUser;
        if (!user) return req.ip || 'anonymous';
        
        return this.generateKey(limitType, user._id.toString(), user.organizationId?.toString());
      },
      message: {
        error: 'Too many requests from this user',
        type: 'rate_limit_exceeded',
        windowMs,
        limitType
      },
      standardHeaders: true,
      legacyHeaders: false
    } as any);
  }

  // Create endpoint-specific rate limiter
  createEndpointRateLimiter(endpoint: string, config: RateLimitConfig): any {
    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      keyGenerator: (req: Request): string => {
        const user = req.user as IUser;
        if (!user) return req.ip || 'anonymous';
        
        return this.generateKey('endpoint', user._id.toString(), user.organizationId?.toString(), endpoint);
      },
      message: {
        error: `Too many requests to ${endpoint}`,
        type: 'endpoint_rate_limit_exceeded',
        endpoint,
        windowMs: config.windowMs
      },
      skipSuccessfulRequests: config.skipSuccessfulRequests,
      skipFailedRequests: config.skipFailedRequests,
      standardHeaders: true,
      legacyHeaders: false
    } as any);
  }

  // Create slow down middleware for gradual response delay
  createSlowDown(endpoint: string, delayAfter: number = 5, delayMs: number = 500): any {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter,
      delayMs,
      maxDelayMs: 10000, // Max 10 seconds delay
      keyGenerator: (req: Request): string => {
        const user = req.user as IUser;
        if (!user) return req.ip || 'anonymous';
        
        return this.generateKey('slowdown', user._id.toString(), user.organizationId?.toString(), endpoint);
      }
    } as any);
  }

  // Middleware for file upload size limits
  checkFileUploadLimit = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user as IUser;
      if (!user) {
        throw new AppError('Authentication required for file upload', 401);
      }

      const limits = this.calculateLimits(user, 'free'); // TODO: Get actual org tier
      const contentLength = parseInt(req.headers['content-length'] || '0');

      if (contentLength > limits.fileUploadSize) {
        throw new AppError(
          `File too large. Maximum allowed: ${Math.floor(limits.fileUploadSize / 1024 / 1024)}MB for ${user.role} users`,
          413
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  // Middleware for concurrent request limiting
  checkConcurrentRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user as IUser;
      if (!user) return next();

      if (!this.isRedisConnected) return next(); // Skip if Redis not available

      const limits = this.calculateLimits(user, 'free');
      const concurrentKey = this.generateKey('concurrent', user._id.toString(), user.organizationId?.toString());
      
      const currentCount = await this.redis!.incr(concurrentKey);
      
      if (currentCount > limits.concurrentRequests) {
        await this.redis!.decr(concurrentKey);
        throw new AppError(
          `Too many concurrent requests. Maximum allowed: ${limits.concurrentRequests} for ${user.role} users`,
          429
        );
      }

      // Set expiry for the key
      await this.redis!.expire(concurrentKey, 60); // 1 minute expiry

      // Decrement on response finish
      res.on('finish', async () => {
        try {
          await this.redis!.decr(concurrentKey);
        } catch (error) {
          logger.error('Failed to decrement concurrent request count:', error);
        }
      });

      next();
    } catch (error) {
      next(error);
    }
  };

  // Get current rate limit status for user
  async getRateLimitStatus(userId: string, organizationId?: string): Promise<{
    limits: UserTier;
    currentUsage: Record<string, number>;
  }> {
    const user = { _id: userId, role: 'viewer', organizationId } as any; // Simplified for status check
    const limits = this.calculateLimits(user, 'free');
    
    let currentUsage: Record<string, number> = {};

    if (this.isRedisConnected && this.redis) {
      try {
        const keys = [
          this.generateKey('minute', userId, organizationId),
          this.generateKey('hour', userId, organizationId),
          this.generateKey('day', userId, organizationId),
          this.generateKey('concurrent', userId, organizationId)
        ];

        const values = await this.redis.mget(...keys);
        currentUsage = {
          minute: parseInt(values[0] || '0'),
          hour: parseInt(values[1] || '0'),
          day: parseInt(values[2] || '0'),
          concurrent: parseInt(values[3] || '0')
        };
      } catch (error) {
        logger.error('Failed to get rate limit status:', error);
      }
    }

    return { limits, currentUsage };
  }

  // Health check
  async healthCheck(): Promise<{ redis: boolean; rateLimiting: boolean }> {
    let redisHealthy = false;

    if (this.redis && this.isRedisConnected) {
      try {
        await this.redis.ping();
        redisHealthy = true;
      } catch (error) {
        logger.error('Redis health check failed:', error);
      }
    }

    return {
      redis: redisHealthy,
      rateLimiting: true // Always available (falls back to memory)
    };
  }
}

export const advancedRateLimitService = new AdvancedRateLimitService();

// Export commonly used rate limiters
export const userRateLimiters = {
  minute: advancedRateLimitService.createUserRateLimiter(60 * 1000, 'minute'),
  hour: advancedRateLimitService.createUserRateLimiter(60 * 60 * 1000, 'hour'),
  day: advancedRateLimitService.createUserRateLimiter(24 * 60 * 60 * 1000, 'day')
};

// Export endpoint-specific limiters
export const endpointLimiters = {
  upload: advancedRateLimitService.createEndpointRateLimiter('upload', {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 uploads per minute
    skipSuccessfulRequests: false
  }),
  
  analysis: advancedRateLimitService.createEndpointRateLimiter('analysis', {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 analysis requests per minute
    skipFailedRequests: true
  }),
  
  aiQuery: advancedRateLimitService.createEndpointRateLimiter('ai-query', {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 AI queries per minute
    skipFailedRequests: true
  })
};

export default advancedRateLimitService;