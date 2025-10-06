import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { env } from '../config/environment';
import { 
  BaseError, 
  ErrorType, 
  ErrorSeverity, 
  ErrorResponse,
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  ValidationError,
  DatabaseError,
  RecordNotFoundError,
  DuplicateRecordError,
  ExternalServiceError,
  ServiceUnavailableError,
  BusinessRuleViolationError,
  OperationNotAllowedError,
  QuotaExceededError,
  ConfigurationError,
  CircuitBreakerOpenError
} from '../types/errors';

export interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class AppError extends Error implements CustomError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Enhanced error handler with comprehensive error processing
 */
export const errorHandler = (
  err: Error | BaseError | CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error: BaseError;
  let statusCode = 500;
  let userMessage = 'An unexpected error occurred';
  let suggestions: string[] = [];
  let retryable = false;

  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle different error types
  if (err instanceof BaseError) {
    // Use the enhanced error directly
    error = err;
    statusCode = getStatusCodeFromErrorType(err.type);
    userMessage = err.userMessage;
    suggestions = err.suggestions || [];
    retryable = err.retryable;
  } else if (err instanceof AppError) {
    // Convert legacy AppError to BaseError
    error = new BaseError(
      err.message,
      ErrorType.INTERNAL_SERVER_ERROR,
      ErrorSeverity.MEDIUM,
      { requestId },
      false,
      err.message
    );
    statusCode = err.statusCode;
  } else {
    // Handle native errors and convert to BaseError
    const baseError = convertNativeError(err, req);
    error = baseError;
    statusCode = getStatusCodeFromErrorType(baseError.type);
    userMessage = baseError.userMessage;
    suggestions = baseError.suggestions || [];
    retryable = baseError.retryable;
  }

  // Enhanced logging with context
  const logContext = {
    requestId,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    errorType: error.type,
    severity: error.severity,
    retryable: error.retryable,
    timestamp: error.timestamp
  };

  // Log based on severity
  if (error.severity === ErrorSeverity.CRITICAL) {
    logger.error('Critical error occurred:', { ...logContext, error: err });
  } else if (error.severity === ErrorSeverity.HIGH) {
    logger.error('High severity error:', { ...logContext, error: err });
  } else if (error.severity === ErrorSeverity.MEDIUM) {
    logger.warn('Medium severity error:', { ...logContext, error: err });
  } else {
    logger.info('Low severity error:', { ...logContext, error: err });
  }

  // Prepare error response
  const response: ErrorResponse = {
    success: false,
    error: {
      type: error.type,
      message: error.message,
      userMessage,
      suggestions: suggestions.length > 0 ? suggestions : [],
      retryable,
      timestamp: error.timestamp.toISOString(),
      requestId
    },
    metadata: {
      severity: error.severity,
      ...(error.context && { context: error.context })
    }
  };

  // Add stack trace in development
  if (env.server.isDevelopment || process.env.NODE_ENV === 'development') {
    (response as any).error.stack = err.stack;
  }

  // Add retry information for retryable errors
  if (retryable) {
    (response as any).error.retryAfter = getRetryAfterSeconds(error.type);
  }

  res.status(statusCode).json(response);
};

/**
 * Convert native errors to BaseError instances
 */
function convertNativeError(err: Error, req: Request): BaseError {
  const requestId = req.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle MongoDB errors
  if (err.name === 'ValidationError') {
    return new ValidationError(
      'Invalid data provided',
      undefined,
      { requestId }
    );
  } else if (err.name === 'CastError') {
    return new ValidationError(
      'Invalid ID format',
      'id',
      { requestId }
    );
  } else if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    return new DuplicateRecordError(
      'Record',
      'unique field',
      { requestId }
    );
  } else if (err.name === 'MongoNetworkError') {
    return new DatabaseError(
      'Database connection failed',
      'connection',
      { requestId }
    );
  } else if (err.name === 'MongoTimeoutError') {
    return new DatabaseError(
      'Database operation timed out',
      'timeout',
      { requestId }
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new AuthenticationError(
      'Invalid token provided',
      { requestId }
    );
  } else if (err.name === 'TokenExpiredError') {
    return new TokenExpiredError({ requestId });
  }

  // Handle custom error names for testing
  if (err.name === 'AuthenticationError') {
    return new AuthenticationError(
      err.message,
      { requestId }
    );
  } else if (err.name === 'AuthorizationError') {
    return new BaseError(
      err.message,
      ErrorType.INSUFFICIENT_PERMISSIONS,
      ErrorSeverity.MEDIUM,
      { requestId },
      false,
      err.message
    );
  } else if (err.name === 'NotFoundError') {
    return new BaseError(
      err.message,
      ErrorType.RECORD_NOT_FOUND,
      ErrorSeverity.MEDIUM,
      { requestId },
      false,
      err.message
    );
  } else if (err.name === 'RateLimitError') {
    return new BaseError(
      err.message,
      ErrorType.API_RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      { requestId },
      false,
      err.message
    );
  } else if (err.name === 'SyntaxError') {
    return new BaseError(
      err.message,
      ErrorType.INVALID_INPUT,
      ErrorSeverity.MEDIUM,
      { requestId },
      false,
      err.message
    );
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    const multerErr = err as any;
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      return new ValidationError(
        'File size exceeds maximum allowed',
        'file',
        { requestId }
      );
    } else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
      return new ValidationError(
        'Unexpected file field',
        'file',
        { requestId }
      );
    }
  }

  // Handle network errors
  if (err.name === 'FetchError' || err.message.includes('fetch')) {
    return new ExternalServiceError(
      'External API',
      'Network request failed',
      { requestId }
    );
  }

  // Handle timeout errors
  if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
    return new ExternalServiceError(
      'External API',
      'Request timed out',
      { requestId }
    );
  }

  // Default to internal server error
  return new BaseError(
    err.message || 'An unexpected error occurred',
    ErrorType.INTERNAL_SERVER_ERROR,
    ErrorSeverity.HIGH,
    { requestId },
    false,
    'An unexpected error occurred. Please try again.',
    ['Try the operation again', 'Contact support if the issue persists']
  );
}

/**
 * Get HTTP status code from error type
 */
function getStatusCodeFromErrorType(errorType: ErrorType): number {
  const statusMap: Record<ErrorType, number> = {
    [ErrorType.AUTHENTICATION_REQUIRED]: 401,
    [ErrorType.INVALID_CREDENTIALS]: 401,
    [ErrorType.TOKEN_EXPIRED]: 401,
    [ErrorType.TOKEN_INVALID]: 401,
    [ErrorType.INSUFFICIENT_PERMISSIONS]: 403,
    [ErrorType.ACCOUNT_DEACTIVATED]: 403,
    [ErrorType.EMAIL_NOT_VERIFIED]: 403,
    [ErrorType.VALIDATION_ERROR]: 400,
    [ErrorType.INVALID_INPUT]: 400,
    [ErrorType.MISSING_REQUIRED_FIELD]: 400,
    [ErrorType.INVALID_FORMAT]: 400,
    [ErrorType.FILE_TOO_LARGE]: 413,
    [ErrorType.INVALID_FILE_TYPE]: 400,
    [ErrorType.DATABASE_CONNECTION_ERROR]: 503,
    [ErrorType.DATABASE_QUERY_ERROR]: 500,
    [ErrorType.RECORD_NOT_FOUND]: 404,
    [ErrorType.DUPLICATE_RECORD]: 409,
    [ErrorType.CONSTRAINT_VIOLATION]: 400,
    [ErrorType.EXTERNAL_SERVICE_ERROR]: 502,
    [ErrorType.API_RATE_LIMIT]: 429,
    [ErrorType.API_TIMEOUT]: 504,
    [ErrorType.SERVICE_UNAVAILABLE]: 503,
    [ErrorType.NETWORK_ERROR]: 502,
    [ErrorType.BUSINESS_RULE_VIOLATION]: 422,
    [ErrorType.OPERATION_NOT_ALLOWED]: 403,
    [ErrorType.RESOURCE_CONFLICT]: 409,
    [ErrorType.QUOTA_EXCEEDED]: 429,
    [ErrorType.INTERNAL_SERVER_ERROR]: 500,
    [ErrorType.CONFIGURATION_ERROR]: 500,
    [ErrorType.DEPENDENCY_ERROR]: 503,
    [ErrorType.CIRCUIT_BREAKER_OPEN]: 503
  };

  return statusMap[errorType] || 500;
}

/**
 * Get retry after seconds for retryable errors
 */
function getRetryAfterSeconds(errorType: ErrorType): number {
  const retryMap: Record<ErrorType, number> = {
    // Authentication & Authorization
    [ErrorType.AUTHENTICATION_REQUIRED]: 0,
    [ErrorType.INVALID_CREDENTIALS]: 0,
    [ErrorType.TOKEN_EXPIRED]: 0,
    [ErrorType.TOKEN_INVALID]: 0,
    [ErrorType.INSUFFICIENT_PERMISSIONS]: 0,
    [ErrorType.ACCOUNT_DEACTIVATED]: 0,
    [ErrorType.EMAIL_NOT_VERIFIED]: 0,
    
    // Validation Errors
    [ErrorType.VALIDATION_ERROR]: 0,
    [ErrorType.INVALID_INPUT]: 0,
    [ErrorType.MISSING_REQUIRED_FIELD]: 0,
    [ErrorType.INVALID_FORMAT]: 0,
    [ErrorType.FILE_TOO_LARGE]: 0,
    [ErrorType.INVALID_FILE_TYPE]: 0,
    
    // Database Errors
    [ErrorType.DATABASE_CONNECTION_ERROR]: 10,
    [ErrorType.DATABASE_QUERY_ERROR]: 5,
    [ErrorType.RECORD_NOT_FOUND]: 0,
    [ErrorType.DUPLICATE_RECORD]: 0,
    [ErrorType.CONSTRAINT_VIOLATION]: 0,
    
    // External Service Errors
    [ErrorType.EXTERNAL_SERVICE_ERROR]: 15,
    [ErrorType.API_RATE_LIMIT]: 60,
    [ErrorType.API_TIMEOUT]: 30,
    [ErrorType.SERVICE_UNAVAILABLE]: 30,
    [ErrorType.NETWORK_ERROR]: 5,
    
    // Business Logic Errors
    [ErrorType.BUSINESS_RULE_VIOLATION]: 0,
    [ErrorType.OPERATION_NOT_ALLOWED]: 0,
    [ErrorType.RESOURCE_CONFLICT]: 0,
    [ErrorType.QUOTA_EXCEEDED]: 0,
    
    // System Errors
    [ErrorType.INTERNAL_SERVER_ERROR]: 0,
    [ErrorType.CONFIGURATION_ERROR]: 0,
    [ErrorType.DEPENDENCY_ERROR]: 0,
    [ErrorType.CIRCUIT_BREAKER_OPEN]: 60
  };

  return retryMap[errorType] || 30;
}

/**
 * Enhanced async handler with error context
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    // Add request context to error if it doesn't have one
    if (error instanceof BaseError && !error.context) {
      const context = {
        requestId: req.headers['x-request-id'] as string,
        userId: (req as any).user?.id,
        operation: `${req.method} ${req.originalUrl}`
      };
      
      // Create a new error with context instead of modifying the existing one
      const errorWithContext = new (error.constructor as any)(
        error.message,
        context,
        error.suggestions
      );
      errorWithContext.stack = error.stack;
      next(errorWithContext);
      return;
    }
    next(error);
  });
};

/**
 * Error boundary for unhandled promise rejections
 */
export const handleUnhandledRejection = (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });
};

/**
 * Error boundary for uncaught exceptions
 */
export const handleUncaughtException = (error: Error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack
  });
  
  // Graceful shutdown
  process.exit(1);
};

/**
 * Not found handler for 404 errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new BaseError(
    `Route ${req.originalUrl} not found`,
    ErrorType.RECORD_NOT_FOUND,
    ErrorSeverity.LOW,
    { 
      requestId: req.headers['x-request-id'] as string,
      operation: `${req.method} ${req.originalUrl}`
    },
    false,
    'The requested resource was not found.',
    ['Check the URL', 'Verify the endpoint exists', 'Contact support if needed']
  );
  
  next(error);
};