import { logger } from '../config/logger';
import { 
  ExternalServiceError, 
  DatabaseError, 
  ServiceUnavailableError,
  ApiRateLimitError,
  ErrorType,
  ErrorSeverity
} from '../types/errors';

/**
 * Retry configuration interface
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number; // Exponential backoff multiplier
  jitter: boolean; // Add random jitter to prevent thundering herd
  retryableErrors: ErrorType[];
}

/**
 * Default retry configurations for different operation types
 */
export const defaultRetryConfigs: Record<string, RetryConfig> = {
  // External API calls
  api: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorType.EXTERNAL_SERVICE_ERROR,
      ErrorType.SERVICE_UNAVAILABLE,
      ErrorType.NETWORK_ERROR,
      ErrorType.API_TIMEOUT
    ]
  },
  
  // Database operations
  database: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorType.DATABASE_CONNECTION_ERROR,
      ErrorType.DATABASE_QUERY_ERROR
    ]
  },
  
  // File operations
  file: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorType.EXTERNAL_SERVICE_ERROR,
      ErrorType.SERVICE_UNAVAILABLE
    ]
  },
  
  // Email operations
  email: {
    maxAttempts: 2,
    baseDelay: 3000,
    maxDelay: 12000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorType.EXTERNAL_SERVICE_ERROR,
      ErrorType.SERVICE_UNAVAILABLE
    ]
  }
};

/**
 * Retry result interface
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Enhanced retry logic with exponential backoff and jitter
 */
export class RetryManager {
  private config: RetryConfig;
  private operation: string;

  constructor(operation: string, config?: Partial<RetryConfig>) {
    this.operation = operation;
    const defaultConfig = defaultRetryConfigs.api;
    this.config = {
      maxAttempts: config?.maxAttempts ?? defaultConfig?.maxAttempts ?? 3,
      baseDelay: config?.baseDelay ?? defaultConfig?.baseDelay ?? 1000,
      maxDelay: config?.maxDelay ?? defaultConfig?.maxDelay ?? 10000,
      backoffMultiplier: config?.backoffMultiplier ?? defaultConfig?.backoffMultiplier ?? 2,
      jitter: config?.jitter ?? defaultConfig?.jitter ?? true,
      retryableErrors: config?.retryableErrors ?? defaultConfig?.retryableErrors ?? []
    };
  }

  /**
   * Execute operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    context?: { userId?: string; requestId?: string; metadata?: any }
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}`, {
            operation: this.operation,
            attempts: attempt,
            totalTime: Date.now() - startTime,
            context
          });
        }
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
        logger.warn(`Non-retryable error encountered`, {
          operation: this.operation,
          attempt,
          error: (error as Error).message,
          context
        });
          
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalTime: Date.now() - startTime
          };
        }
        
        // Check if we've exhausted all attempts
        if (attempt === this.config.maxAttempts) {
          logger.error(`Operation failed after ${attempt} attempts`, {
            operation: this.operation,
            attempts: attempt,
            totalTime: Date.now() - startTime,
            error: (error as Error).message,
            context
          });
          
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalTime: Date.now() - startTime
          };
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        
        logger.warn(`Operation failed, retrying in ${delay}ms`, {
          operation: this.operation,
          attempt,
          nextAttempt: attempt + 1,
          delay,
          error: (error as Error).message,
          context
        });
        
        // Wait before next attempt
        await this.sleep(delay);
      }
    }
    
    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: this.config.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Check if error has a type property (our custom errors)
    if (error && typeof error.type === 'string') {
      return this.config.retryableErrors.includes(error.type);
    }
    
    // Check for specific error names/patterns
    const retryablePatterns = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'timeout',
      'network',
      'connection',
      'temporary',
      'unavailable'
    ];
    
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorName = error?.name?.toLowerCase() || '';
    
    return retryablePatterns.some(pattern => 
      errorMessage.includes(pattern) || errorName.includes(pattern)
    );
  }

  /**
   * Calculate delay for next attempt with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, this.config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      const jitterRange = delay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay += jitter;
    }
    
    return Math.max(0, Math.floor(delay));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Retry decorator for methods
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  config?: Partial<RetryConfig>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const retryManager = new RetryManager(operation, config);
    
    descriptor.value = async function (...args: any[]) {
      return retryManager.execute(() => method.apply(this, args));
    };
    
    return descriptor;
  };
}

/**
 * Retry wrapper for external API calls
 */
export async function retryApiCall<T>(
  operation: () => Promise<T>,
  service: string,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  const retryManager = new RetryManager(`api_${service}`, defaultRetryConfigs.api);
  const result = await retryManager.execute(operation, context);
  
  if (!result.success) {
    throw new ExternalServiceError(
      service,
      result.error?.message || 'API call failed',
      context
    );
  }
  
  return result.result!;
}

/**
 * Retry wrapper for database operations
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationType: string,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  const retryManager = new RetryManager(`db_${operationType}`, defaultRetryConfigs.database);
  const result = await retryManager.execute(operation, context);
  
  if (!result.success) {
    throw new DatabaseError(
      result.error?.message || 'Database operation failed',
      operationType,
      context
    );
  }
  
  return result.result!;
}

/**
 * Retry wrapper for file operations
 */
export async function retryFileOperation<T>(
  operation: () => Promise<T>,
  operationType: string,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  const retryManager = new RetryManager(`file_${operationType}`, defaultRetryConfigs.file);
  const result = await retryManager.execute(operation, context);
  
  if (!result.success) {
    throw new ExternalServiceError(
      'File Service',
      result.error?.message || 'File operation failed',
      context
    );
  }
  
  return result.result!;
}

/**
 * Retry wrapper for email operations
 */
export async function retryEmailOperation<T>(
  operation: () => Promise<T>,
  operationType: string,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  const retryManager = new RetryManager(`email_${operationType}`, defaultRetryConfigs.email);
  const result = await retryManager.execute(operation, context);
  
  if (!result.success) {
    throw new ExternalServiceError(
      'Email Service',
      result.error?.message || 'Email operation failed',
      context
    );
  }
  
  return result.result!;
}

/**
 * Rate limit aware retry for API calls
 */
export async function retryWithRateLimit<T>(
  operation: () => Promise<T>,
  service: string,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  const retryManager = new RetryManager(`rate_limited_${service}`, {
    ...defaultRetryConfigs.api,
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000
  });
  
  const result = await retryManager.execute(operation, context);
  
  if (!result.success) {
    // Check if it's a rate limit error
    if (result.error?.message?.toLowerCase().includes('rate limit')) {
      throw new ApiRateLimitError(service, 60, context);
    }
    
    throw new ExternalServiceError(
      service,
      result.error?.message || 'API call failed',
      context
    );
  }
  
  return result.result!;
}

/**
 * Conditional retry based on error type
 */
export async function conditionalRetry<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: Error) => boolean,
  config?: Partial<RetryConfig>,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  const retryManager = new RetryManager('conditional', config);
  
  // Override the retryable check
  const originalIsRetryable = retryManager['isRetryableError'];
  retryManager['isRetryableError'] = (error: any) => shouldRetry(error);
  
  const result = await retryManager.execute(operation, context);
  
  if (!result.success) {
    throw result.error!;
  }
  
  return result.result!;
}

/**
 * Retry middleware for Express routes
 */
export const retryMiddleware = (config?: Partial<RetryConfig>) => {
  return (req: any, res: any, next: any) => {
    const originalSend = res.send;
    const retryManager = new RetryManager('express_route', config);
    
    res.send = function(data: any) {
      // If this is an error response, we might want to retry
      if (res.statusCode >= 500 && res.statusCode < 600) {
        // This would need to be implemented based on specific requirements
        // For now, just send the response normally
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Utility to create retry managers for specific services
 */
export const createRetryManager = (service: string, config?: Partial<RetryConfig>) => {
  const serviceConfig = defaultRetryConfigs[service] || defaultRetryConfigs.api;
  return new RetryManager(service, { ...serviceConfig, ...config });
};

/**
 * Batch retry for multiple operations
 */
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  config?: Partial<RetryConfig>,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<Array<RetryResult<T>>> {
  const retryManager = new RetryManager('batch', config);
  const results: Array<RetryResult<T>> = [];
  
  // Execute operations in parallel with individual retry logic
  const promises = operations.map(async (operation, index) => {
    try {
      const result = await retryManager.execute(operation, {
        ...context,
        metadata: { ...context?.metadata, operationIndex: index }
      });
      return result;
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        attempts: 1,
        totalTime: 0
      };
    }
  });
  
  return Promise.all(promises);
}

/**
 * Circuit breaker wrapper for API calls
 */
export async function withCircuitBreakerApi<T>(
  serviceName: string,
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  return retryApiCall(operation, serviceName, context);
}

/**
 * Circuit breaker wrapper for email operations
 */
export async function withCircuitBreakerEmail<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  return retryEmailOperation(operation, 'email', context);
}