import { logger } from '../config/logger';
import { 
  CircuitBreakerOpenError, 
  ServiceUnavailableError,
  ErrorType,
  ErrorSeverity
} from '../types/errors';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;        // Number of failures before opening
  successThreshold: number;        // Number of successes to close from half-open
  timeout: number;                 // Timeout in milliseconds
  resetTimeout: number;           // Time to wait before trying half-open (ms)
  monitoringPeriod: number;       // Time window for failure counting (ms)
  volumeThreshold: number;         // Minimum number of calls to consider
}

/**
 * Default circuit breaker configurations for different services
 */
export const defaultCircuitConfigs: Record<string, CircuitBreakerConfig> = {
  // External APIs
  api: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 10000,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    volumeThreshold: 10
  },
  
  // Database operations
  database: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 5000,
    resetTimeout: 30000, // 30 seconds
    monitoringPeriod: 120000, // 2 minutes
    volumeThreshold: 5
  },
  
  // File operations
  file: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 15000,
    resetTimeout: 45000, // 45 seconds
    monitoringPeriod: 180000, // 3 minutes
    volumeThreshold: 5
  },
  
  // Email service
  email: {
    failureThreshold: 2,
    successThreshold: 2,
    timeout: 10000,
    resetTimeout: 120000, // 2 minutes
    monitoringPeriod: 300000, // 5 minutes
    volumeThreshold: 3
  }
};

/**
 * Call statistics for monitoring
 */
interface CallStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  lastCallTime: number;
  lastFailureTime: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private config: CircuitBreakerConfig;
  private stats: CallStats;
  private lastStateChange: number = Date.now();
  private serviceName: string;

  constructor(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
    this.serviceName = serviceName;
    const defaultConfig = defaultCircuitConfigs.api;
    this.config = {
      failureThreshold: config?.failureThreshold ?? defaultConfig?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? defaultConfig?.successThreshold ?? 3,
      timeout: config?.timeout ?? defaultConfig?.timeout ?? 10000,
      resetTimeout: config?.resetTimeout ?? defaultConfig?.resetTimeout ?? 60000,
      monitoringPeriod: config?.monitoringPeriod ?? defaultConfig?.monitoringPeriod ?? 300000,
      volumeThreshold: config?.volumeThreshold ?? defaultConfig?.volumeThreshold ?? 10
    };
    
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      lastCallTime: 0,
      lastFailureTime: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    };
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    context?: { userId?: string; requestId?: string; metadata?: any }
  ): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.lastStateChange = Date.now();
        logger.info(`Circuit breaker transitioning to HALF_OPEN for ${this.serviceName}`, {
          service: this.serviceName,
          context
        });
      } else {
        throw new CircuitBreakerOpenError(this.serviceName, context);
      }
    }

    // Record call attempt
    this.recordCall();

    try {
      // Execute operation with timeout
      const result = await this.executeWithTimeout(operation);
      
      // Record success
      this.recordSuccess();
      
      // Check if we should close the circuit (from half-open)
      if (this.state === CircuitState.HALF_OPEN && this.shouldCloseCircuit()) {
        this.state = CircuitState.CLOSED;
        this.lastStateChange = Date.now();
        logger.info(`Circuit breaker closed for ${this.serviceName}`, {
          service: this.serviceName,
          context
        });
      }
      
      return result;
    } catch (error) {
      // Record failure
      this.recordFailure();
      
      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.state = CircuitState.OPEN;
        this.lastStateChange = Date.now();
        logger.error(`Circuit breaker opened for ${this.serviceName}`, {
          service: this.serviceName,
          failureRate: this.getFailureRate(),
          consecutiveFailures: this.stats.consecutiveFailures,
          context
        });
      }
      
      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Record a call attempt
   */
  private recordCall(): void {
    this.stats.totalCalls++;
    this.stats.lastCallTime = Date.now();
  }

  /**
   * Record a successful call
   */
  private recordSuccess(): void {
    this.stats.successfulCalls++;
    this.stats.consecutiveSuccesses++;
    this.stats.consecutiveFailures = 0;
  }

  /**
   * Record a failed call
   */
  private recordFailure(): void {
    this.stats.failedCalls++;
    this.stats.consecutiveFailures++;
    this.stats.consecutiveSuccesses = 0;
    this.stats.lastFailureTime = Date.now();
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    // Check if we have enough volume to make a decision
    if (this.stats.totalCalls < this.config.volumeThreshold) {
      return false;
    }

    // Check consecutive failures
    if (this.stats.consecutiveFailures >= this.config.failureThreshold) {
      return true;
    }

    // Check failure rate over monitoring period
    const now = Date.now();
    const timeWindow = now - this.config.monitoringPeriod;
    
    // This is a simplified check - in a real implementation,
    // you'd want to track failures within the time window
    const failureRate = this.getFailureRate();
    return failureRate > 0.5; // 50% failure rate threshold
  }

  /**
   * Check if circuit should be closed (from half-open)
   */
  private shouldCloseCircuit(): boolean {
    return this.stats.consecutiveSuccesses >= this.config.successThreshold;
  }

  /**
   * Check if we should attempt reset from open state
   */
  private shouldAttemptReset(): boolean {
    const timeSinceLastStateChange = Date.now() - this.lastStateChange;
    return timeSinceLastStateChange >= this.config.resetTimeout;
  }

  /**
   * Get current failure rate
   */
  private getFailureRate(): number {
    if (this.stats.totalCalls === 0) return 0;
    return this.stats.failedCalls / this.stats.totalCalls;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): CallStats & { failureRate: number; state: CircuitState } {
    return {
      ...this.stats,
      failureRate: this.getFailureRate(),
      state: this.state
    };
  }

  /**
   * Reset circuit breaker (for testing or manual intervention)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.lastStateChange = Date.now();
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      lastCallTime: 0,
      lastFailureTime: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    };
    
    logger.info(`Circuit breaker reset for ${this.serviceName}`);
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED;
  }
}

/**
 * Circuit breaker manager for multiple services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create circuit breaker for service
   */
  getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const serviceConfig = defaultCircuitConfigs[serviceName] || defaultCircuitConfigs.api;
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, { ...serviceConfig, ...config }));
    }
    
    return this.breakers.get(serviceName)!;
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
    context?: { userId?: string; requestId?: string; metadata?: any }
  ): Promise<T> {
    const breaker = this.getBreaker(serviceName, config);
    return breaker.execute(operation, context);
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatuses(): Record<string, { state: CircuitState; stats: any }> {
    const statuses: Record<string, { state: CircuitState; stats: any }> = {};
    
    for (const [serviceName, breaker] of this.breakers) {
      statuses[serviceName] = {
        state: breaker.getState(),
        stats: breaker.getStats()
      };
    }
    
    return statuses;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Reset specific circuit breaker
   */
  reset(serviceName: string): void {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.reset();
    }
  }
}

/**
 * Global circuit breaker manager instance
 */
export const circuitBreakerManager = new CircuitBreakerManager();

/**
 * Circuit breaker decorator for methods
 */
export function withCircuitBreaker(
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return circuitBreakerManager.execute(
        serviceName,
        () => method.apply(this, args),
        config,
        { metadata: { method: propertyName, class: target.constructor.name } }
      );
    };
    
    return descriptor;
  };
}

/**
 * Circuit breaker wrapper for external API calls
 */
export async function withCircuitBreakerApi<T>(
  serviceName: string,
  operation: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  return circuitBreakerManager.execute(serviceName, operation, config, context);
}

/**
 * Circuit breaker wrapper for database operations
 */
export async function withCircuitBreakerDatabase<T>(
  operation: () => Promise<T>,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  return circuitBreakerManager.execute('database', operation, undefined, context);
}

/**
 * Circuit breaker wrapper for file operations
 */
export async function withCircuitBreakerFile<T>(
  operation: () => Promise<T>,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  return circuitBreakerManager.execute('file', operation, undefined, context);
}

/**
 * Circuit breaker wrapper for email operations
 */
export async function withCircuitBreakerEmail<T>(
  operation: () => Promise<T>,
  context?: { userId?: string; requestId?: string; metadata?: any }
): Promise<T> {
  return circuitBreakerManager.execute('email', operation, undefined, context);
}

/**
 * Health check for circuit breakers
 */
export function getCircuitBreakerHealth(): {
  healthy: boolean;
  services: Record<string, { state: CircuitState; healthy: boolean; stats: any }>;
} {
  const statuses = circuitBreakerManager.getAllStatuses();
  const services: Record<string, { state: CircuitState; healthy: boolean; stats: any }> = {};
  let allHealthy = true;

  for (const [serviceName, status] of Object.entries(statuses)) {
    const healthy = status.state === CircuitState.CLOSED;
    services[serviceName] = {
      state: status.state,
      healthy,
      stats: status.stats
    };
    
    if (!healthy) {
      allHealthy = false;
    }
  }

  return {
    healthy: allHealthy,
    services
  };
}

/**
 * Circuit breaker middleware for Express routes
 */
export const circuitBreakerMiddleware = (serviceName: string, config?: Partial<CircuitBreakerConfig>) => {
  return async (req: any, res: any, next: any) => {
    try {
      // Check circuit breaker status before processing
      const breaker = circuitBreakerManager.getBreaker(serviceName, config);
      
      if (breaker.getState() === CircuitState.OPEN) {
        throw new CircuitBreakerOpenError(serviceName, {
          requestId: req.headers['x-request-id'],
          userId: req.user?.id
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Circuit breaker status endpoint
 */
export const getCircuitBreakerStatus = (req: any, res: any) => {
  const health = getCircuitBreakerHealth();
  
  res.json({
    success: true,
    data: health
  });
};

/**
 * Manual circuit breaker control
 */
export const resetCircuitBreaker = (serviceName: string) => {
  circuitBreakerManager.reset(serviceName);
  logger.info(`Circuit breaker manually reset for ${serviceName}`);
};

/**
 * Circuit breaker monitoring and alerting
 */
export class CircuitBreakerMonitor {
  private alertThresholds = {
    failureRate: 0.3, // 30% failure rate
    consecutiveFailures: 3,
    openDuration: 300000 // 5 minutes
  };

  /**
   * Check for alert conditions
   */
  checkAlerts(): Array<{ service: string; alert: string; severity: string }> {
    const alerts: Array<{ service: string; alert: string; severity: string }> = [];
    const statuses = circuitBreakerManager.getAllStatuses();

    for (const [serviceName, status] of Object.entries(statuses)) {
      const { state, stats } = status;
      
      // Alert on high failure rate
      if (stats.failureRate > this.alertThresholds.failureRate) {
        alerts.push({
          service: serviceName,
          alert: `High failure rate: ${(stats.failureRate * 100).toFixed(1)}%`,
          severity: 'warning'
        });
      }
      
      // Alert on consecutive failures
      if (stats.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
        alerts.push({
          service: serviceName,
          alert: `Consecutive failures: ${stats.consecutiveFailures}`,
          severity: 'error'
        });
      }
      
      // Alert on circuit being open for too long
      if (state === CircuitState.OPEN) {
        const openDuration = Date.now() - stats.lastFailureTime;
        if (openDuration > this.alertThresholds.openDuration) {
          alerts.push({
            service: serviceName,
            alert: `Circuit has been open for ${Math.round(openDuration / 60000)} minutes`,
            severity: 'critical'
          });
        }
      }
    }

    return alerts;
  }
}

/**
 * Global circuit breaker monitor
 */
export const circuitBreakerMonitor = new CircuitBreakerMonitor();
