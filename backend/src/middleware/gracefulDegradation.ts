import { logger } from '../config/logger';
import { 
  ServiceUnavailableError, 
  ExternalServiceError,
  ErrorType,
  ErrorSeverity,
  BaseError
} from '../types/errors';

/**
 * Service priority levels for graceful degradation
 */
export enum ServicePriority {
  CRITICAL = 'CRITICAL',     // Service failure causes complete failure
  HIGH = 'HIGH',             // Service failure significantly impacts functionality
  MEDIUM = 'MEDIUM',         // Service failure has moderate impact
  LOW = 'LOW',               // Service failure has minimal impact
  OPTIONAL = 'OPTIONAL'      // Service failure has no impact
}

/**
 * Fallback strategy types
 */
export enum FallbackStrategy {
  CACHE = 'CACHE',           // Use cached data
  DEFAULT = 'DEFAULT',       // Use default values
  DISABLE = 'DISABLE',       // Disable feature
  REDIRECT = 'REDIRECT',     // Redirect to alternative
  QUEUE = 'QUEUE'            // Queue for later processing
}

/**
 * Service configuration for graceful degradation
 */
export interface ServiceConfig {
  name: string;
  priority: ServicePriority;
  fallbackStrategy: FallbackStrategy;
  fallbackData?: any;
  timeout: number;
  retryAttempts: number;
  circuitBreakerEnabled: boolean;
  cacheEnabled: boolean;
  cacheTTL: number; // Time to live in milliseconds
}

/**
 * Default service configurations
 */
export const defaultServiceConfigs: Record<string, ServiceConfig> = {
  // Critical services - no graceful degradation
  database: {
    name: 'database',
    priority: ServicePriority.CRITICAL,
    fallbackStrategy: FallbackStrategy.DISABLE,
    timeout: 5000,
    retryAttempts: 3,
    circuitBreakerEnabled: true,
    cacheEnabled: false,
    cacheTTL: 0
  },
  
  // High priority services - limited graceful degradation
  auth: {
    name: 'auth',
    priority: ServicePriority.HIGH,
    fallbackStrategy: FallbackStrategy.DISABLE,
    timeout: 3000,
    retryAttempts: 2,
    circuitBreakerEnabled: true,
    cacheEnabled: true,
    cacheTTL: 300000 // 5 minutes
  },
  
  // Medium priority services - moderate graceful degradation
  email: {
    name: 'email',
    priority: ServicePriority.MEDIUM,
    fallbackStrategy: FallbackStrategy.QUEUE,
    timeout: 10000,
    retryAttempts: 2,
    circuitBreakerEnabled: true,
    cacheEnabled: false,
    cacheTTL: 0
  },
  
  ai: {
    name: 'ai',
    priority: ServicePriority.MEDIUM,
    fallbackStrategy: FallbackStrategy.DEFAULT,
    fallbackData: { message: 'AI service temporarily unavailable' },
    timeout: 15000,
    retryAttempts: 1,
    circuitBreakerEnabled: true,
    cacheEnabled: true,
    cacheTTL: 600000 // 10 minutes
  },
  
  // Low priority services - extensive graceful degradation
  analytics: {
    name: 'analytics',
    priority: ServicePriority.LOW,
    fallbackStrategy: FallbackStrategy.QUEUE,
    timeout: 5000,
    retryAttempts: 1,
    circuitBreakerEnabled: true,
    cacheEnabled: false,
    cacheTTL: 0
  },
  
  notifications: {
    name: 'notifications',
    priority: ServicePriority.LOW,
    fallbackStrategy: FallbackStrategy.QUEUE,
    timeout: 3000,
    retryAttempts: 1,
    circuitBreakerEnabled: true,
    cacheEnabled: false,
    cacheTTL: 0
  },
  
  // Optional services - full graceful degradation
  recommendations: {
    name: 'recommendations',
    priority: ServicePriority.OPTIONAL,
    fallbackStrategy: FallbackStrategy.DEFAULT,
    fallbackData: { recommendations: [] },
    timeout: 2000,
    retryAttempts: 0,
    circuitBreakerEnabled: false,
    cacheEnabled: true,
    cacheTTL: 1800000 // 30 minutes
  }
};

/**
 * Fallback data cache
 */
class FallbackCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  set(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Graceful degradation manager
 */
export class GracefulDegradationManager {
  private serviceConfigs: Map<string, ServiceConfig> = new Map();
  private fallbackCache: FallbackCache = new FallbackCache();
  private degradedServices: Set<string> = new Set();
  private serviceQueues: Map<string, Array<{ operation: () => Promise<any>; context?: any }>> = new Map();

  constructor() {
    // Initialize with default configurations
    for (const [name, config] of Object.entries(defaultServiceConfigs)) {
      this.serviceConfigs.set(name, config);
    }
  }

  /**
   * Execute operation with graceful degradation
   */
  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    context?: { userId?: string; requestId?: string; metadata?: any }
  ): Promise<T> {
    const config = this.serviceConfigs.get(serviceName);
    if (!config) {
      throw new Error(`Service configuration not found for ${serviceName}`);
    }

    // Check if service is already degraded
    if (this.degradedServices.has(serviceName)) {
      return this.handleDegradedService<T>(serviceName, config, context);
    }

    try {
      // Execute operation with timeout
      const result = await this.executeWithTimeout(operation, config.timeout);
      
      // Cache successful result if caching is enabled
      if (config.cacheEnabled && result) {
        const cacheKey = this.getCacheKey(serviceName, context);
        this.fallbackCache.set(cacheKey, result, config.cacheTTL);
      }
      
      return result;
    } catch (error) {
      logger.warn(`Service ${serviceName} failed, attempting graceful degradation`, {
        service: serviceName,
        error: (error as Error).message,
        context
      });

      // Mark service as degraded
      this.degradedServices.add(serviceName);
      
      // Schedule service recovery check
      this.scheduleServiceRecovery(serviceName, config);
      
      return this.handleDegradedService<T>(serviceName, config, context);
    }
  }

  /**
   * Handle degraded service with fallback strategy
   */
  private async handleDegradedService<T>(
    serviceName: string,
    config: ServiceConfig,
    context?: any
  ): Promise<T> {
    switch (config.fallbackStrategy) {
      case FallbackStrategy.CACHE:
        return this.handleCacheFallback<T>(serviceName, config, context);
      
      case FallbackStrategy.DEFAULT:
        return this.handleDefaultFallback<T>(config);
      
      case FallbackStrategy.DISABLE:
        throw new ServiceUnavailableError(serviceName, context);
      
      case FallbackStrategy.QUEUE:
        return this.handleQueueFallback<T>(serviceName, config, context);
      
      case FallbackStrategy.REDIRECT:
        return this.handleRedirectFallback<T>(serviceName, config, context);
      
      default:
        throw new ServiceUnavailableError(serviceName, context);
    }
  }

  /**
   * Handle cache fallback
   */
  private async handleCacheFallback<T>(
    serviceName: string,
    config: ServiceConfig,
    context?: any
  ): Promise<T> {
    const cacheKey = this.getCacheKey(serviceName, context);
    const cachedData = this.fallbackCache.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Using cached data for degraded service ${serviceName}`, {
        service: serviceName,
        context
      });
      return cachedData;
    }
    
    // If no cached data and service is critical, throw error
    if (config.priority === ServicePriority.CRITICAL) {
      throw new ServiceUnavailableError(serviceName, context);
    }
    
    // For non-critical services, return default data
    return config.fallbackData || null;
  }

  /**
   * Handle default fallback
   */
  private async handleDefaultFallback<T>(config: ServiceConfig): Promise<T> {
    return config.fallbackData || null;
  }

  /**
   * Handle queue fallback
   */
  private async handleQueueFallback<T>(
    serviceName: string,
    config: ServiceConfig,
    context?: any
  ): Promise<T> {
    // Queue the operation for later processing
    if (!this.serviceQueues.has(serviceName)) {
      this.serviceQueues.set(serviceName, []);
    }
    
    const queue = this.serviceQueues.get(serviceName)!;
    queue.push({ operation: () => Promise.resolve(null), context });
    
    logger.info(`Queued operation for degraded service ${serviceName}`, {
      service: serviceName,
      queueSize: queue.length,
      context
    });
    
    // Return immediate response
    return config.fallbackData || null;
  }

  /**
   * Handle redirect fallback
   */
  private async handleRedirectFallback<T>(
    serviceName: string,
    config: ServiceConfig,
    context?: any
  ): Promise<T> {
    // This would typically redirect to an alternative service
    // For now, return default data
    return config.fallbackData || null;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timeout after ${timeout}ms`));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Schedule service recovery check
   */
  private scheduleServiceRecovery(serviceName: string, config: ServiceConfig): void {
    setTimeout(async () => {
      try {
        // Attempt to recover the service
        await this.attemptServiceRecovery(serviceName, config);
      } catch (error) {
        logger.error(`Service recovery failed for ${serviceName}`, {
          service: serviceName,
          error: (error as Error).message
        });
        
        // Schedule another recovery attempt
        this.scheduleServiceRecovery(serviceName, config);
      }
    }, 30000); // Try recovery after 30 seconds
  }

  /**
   * Attempt to recover a degraded service
   */
  private async attemptServiceRecovery(serviceName: string, config: ServiceConfig): Promise<void> {
    // This would typically involve a health check or simple operation
    // For now, we'll just remove from degraded services
    this.degradedServices.delete(serviceName);
    
    logger.info(`Service ${serviceName} recovered`, {
      service: serviceName
    });
    
    // Process any queued operations
    await this.processQueuedOperations(serviceName);
  }

  /**
   * Process queued operations for a service
   */
  private async processQueuedOperations(serviceName: string): Promise<void> {
    const queue = this.serviceQueues.get(serviceName);
    if (!queue || queue.length === 0) return;

    logger.info(`Processing ${queue.length} queued operations for ${serviceName}`, {
      service: serviceName,
      queueSize: queue.length
    });

    // Process operations in batches
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < queue.length; i += batchSize) {
      batches.push(queue.splice(i, batchSize));
    }

    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(async ({ operation, context }) => {
          try {
            await operation();
          } catch (error) {
            logger.error(`Queued operation failed for ${serviceName}`, {
              service: serviceName,
              error: (error as Error).message,
              context
            });
          }
        })
      );
    }
  }

  /**
   * Get cache key for service and context
   */
  private getCacheKey(serviceName: string, context?: any): string {
    const contextStr = context ? JSON.stringify(context) : '';
    return `${serviceName}:${Buffer.from(contextStr).toString('base64')}`;
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceName: string): {
    degraded: boolean;
    config: ServiceConfig;
    queueSize: number;
  } {
    const config = this.serviceConfigs.get(serviceName);
    const queue = this.serviceQueues.get(serviceName);
    
    return {
      degraded: this.degradedServices.has(serviceName),
      config: config!,
      queueSize: queue ? queue.length : 0
    };
  }

  /**
   * Get all service statuses
   */
  getAllServiceStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    
    for (const serviceName of this.serviceConfigs.keys()) {
      statuses[serviceName] = this.getServiceStatus(serviceName);
    }
    
    return statuses;
  }

  /**
   * Manually mark service as degraded
   */
  markServiceDegraded(serviceName: string): void {
    this.degradedServices.add(serviceName);
    logger.info(`Service ${serviceName} manually marked as degraded`);
  }

  /**
   * Manually recover service
   */
  recoverService(serviceName: string): void {
    this.degradedServices.delete(serviceName);
    logger.info(`Service ${serviceName} manually recovered`);
  }

  /**
   * Clear fallback cache
   */
  clearCache(): void {
    this.fallbackCache.clear();
    logger.info('Fallback cache cleared');
  }

  /**
   * Update service configuration
   */
  updateServiceConfig(serviceName: string, config: Partial<ServiceConfig>): void {
    const existingConfig = this.serviceConfigs.get(serviceName);
    if (existingConfig) {
      this.serviceConfigs.set(serviceName, { ...existingConfig, ...config });
      logger.info(`Service configuration updated for ${serviceName}`, { config });
    }
  }
}

/**
 * Global graceful degradation manager
 */
export const gracefulDegradationManager = new GracefulDegradationManager();

/**
 * Graceful degradation wrapper for services
 */
export async function withGracefulDegradation<T>(
  serviceName: string,
  operation: () => Promise<T>,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  return gracefulDegradationManager.execute(serviceName, operation, context);
}

/**
 * Graceful degradation middleware for Express routes
 */
export const gracefulDegradationMiddleware = (serviceName: string) => {
  return async (req: any, res: any, next: any) => {
    try {
      // Check if service is degraded
      const status = gracefulDegradationManager.getServiceStatus(serviceName);
      
      if (status.degraded) {
        logger.warn(`Request to degraded service ${serviceName}`, {
          service: serviceName,
          url: req.originalUrl,
          method: req.method
        });
        
        // Add degraded service header
        res.set('X-Service-Status', 'degraded');
        res.set('X-Service-Name', serviceName);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Service health check endpoint
 */
export const getServiceHealth = (req: any, res: any) => {
  const statuses = gracefulDegradationManager.getAllServiceStatuses();
  
  res.json({
    success: true,
    data: {
      services: statuses,
      degradedCount: Object.values(statuses).filter((s: any) => s.degraded).length,
      totalServices: Object.keys(statuses).length
    }
  });
};

/**
 * Manual service control endpoints
 */
export const markServiceDegraded = (serviceName: string) => {
  gracefulDegradationManager.markServiceDegraded(serviceName);
};

export const recoverService = (serviceName: string) => {
  gracefulDegradationManager.recoverService(serviceName);
};

export const clearServiceCache = () => {
  gracefulDegradationManager.clearCache();
};

/**
 * Feature flag integration for graceful degradation
 */
export class FeatureFlagManager {
  private flags: Map<string, boolean> = new Map();

  isFeatureEnabled(featureName: string): boolean {
    return this.flags.get(featureName) ?? true;
  }

  setFeatureFlag(featureName: string, enabled: boolean): void {
    this.flags.set(featureName, enabled);
    logger.info(`Feature flag ${featureName} set to ${enabled}`);
  }

  getFeatureFlags(): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    for (const [name, enabled] of this.flags) {
      flags[name] = enabled;
    }
    return flags;
  }
}

/**
 * Global feature flag manager
 */
export const featureFlagManager = new FeatureFlagManager();

/**
 * Conditional execution based on feature flags
 */
export async function withFeatureFlag<T>(
  featureName: string,
  operation: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  if (featureFlagManager.isFeatureEnabled(featureName)) {
    try {
      return await operation();
    } catch (error) {
      logger.warn(`Feature ${featureName} failed, using fallback`, {
        feature: featureName,
        error: (error as Error).message
      });
      
      if (fallback) {
        return await fallback();
      }
      
      throw error;
    }
  } else {
    logger.info(`Feature ${featureName} disabled, using fallback`);
    
    if (fallback) {
      return await fallback();
    }
    
    throw new Error(`Feature ${featureName} is disabled`);
  }
}
