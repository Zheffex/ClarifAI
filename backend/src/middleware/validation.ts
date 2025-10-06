import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { logger } from '../config/logger';
import { ValidationError, MissingRequiredFieldError } from '../types/errors';
import { asyncHandler } from './errorHandler';

/**
 * Enhanced validation middleware with comprehensive error handling
 */

/**
 * Sanitize input data to prevent XSS and injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Track visited objects to prevent circular references
    const visited = new WeakSet();
    let depth = 0;
    const MAX_DEPTH = 10;

    // Sanitize string inputs
    const sanitizeString = (str: string): string => {
      if (typeof str !== 'string') return str;
      
      return str
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/<iframe\b[^>]*>/gi, '') // Remove iframe tags
        .replace(/<object\b[^>]*>/gi, '') // Remove object tags
        .replace(/<embed\b[^>]*>/gi, '') // Remove embed tags
        .replace(/<link\b[^>]*>/gi, '') // Remove link tags
        .replace(/<meta\b[^>]*>/gi, ''); // Remove meta tags
    };

    // Recursively sanitize object properties with circular reference protection
    const sanitizeObject = (obj: any, currentDepth: number = 0): any => {
      // Prevent infinite recursion
      if (currentDepth > MAX_DEPTH) {
        logger.warn('Maximum sanitization depth reached, skipping further sanitization');
        return obj;
      }

      if (obj === null || obj === undefined) return obj;
      
      // Check for circular references
      if (typeof obj === 'object' && obj !== null) {
        if (visited.has(obj)) {
          logger.warn('Circular reference detected during sanitization, skipping');
          return obj;
        }
        visited.add(obj);
      }
      
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, currentDepth + 1));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        try {
          for (const [key, value] of Object.entries(obj)) {
            // Skip prototype properties and non-enumerable properties
            if (obj.hasOwnProperty(key)) {
              sanitized[key] = sanitizeObject(value, currentDepth + 1);
            }
          }
        } catch (error) {
          logger.warn('Error during object sanitization:', error);
          return obj; // Return original object if sanitization fails
        }
        return sanitized;
      }
      
      return obj;
    };

    // Sanitize request body (only if it's a plain object, not Express request object)
    if (req.body && typeof req.body === 'object' && req.body.constructor === Object) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object' && req.query.constructor === Object) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize route parameters
    if (req.params && typeof req.params === 'object' && req.params.constructor === Object) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    next(new ValidationError('Input sanitization failed', undefined, {
      requestId: req.headers['x-request-id'] as string
    }));
  }
};

/**
 * Enhanced validation result handler
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: (error as any).value || undefined,
      location: (error as any).location || undefined
    }));

    logger.warn('Validation errors:', {
      requestId: req.headers['x-request-id'] as string,
      url: req.originalUrl,
      method: req.method,
      errors: errorDetails
    });

    const errorMessages = errorDetails.map(error => 
      `${error.field}: ${error.message}`
    ).join('. ');

    next(new ValidationError(
      errorMessages,
      errorDetails[0]?.field,
      {
        requestId: req.headers['x-request-id'] as string,
        metadata: { validationErrors: errorDetails }
      }
    ));
    return;
  }
  
  next();
};

/**
 * Validate MongoDB ObjectId format
 */
export const validateObjectId = (field: string = 'id'): ValidationChain => {
  return param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId`);
};

/**
 * Validate email format
 */
export const validateEmail = (field: string = 'email'): ValidationChain => {
  return body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address');
};

/**
 * Validate password strength
 */
export const validatePassword = (field: string = 'password'): ValidationChain => {
  return body(field)
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    .matches(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/)
    .withMessage('Password contains invalid characters');
};

/**
 * Validate file upload constraints
 */
export const validateFileUpload = (maxSizeMB: number = 10, allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif']): ValidationChain => {
  return body('file')
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error('File is required');
      }
      
      // Check file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (req.file.size > maxSizeBytes) {
        throw new Error(`File size must be less than ${maxSizeMB}MB`);
      }
      
      // Check file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error(`File type must be one of: ${allowedTypes.join(', ')}`);
      }
      
      return true;
    });
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (): ValidationChain[] => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Page must be a positive integer between 1 and 10000'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sort')
      .optional()
      .isIn(['asc', 'desc', '1', '-1'])
      .withMessage('Sort must be asc, desc, 1, or -1')
  ];
};

/**
 * Validate search parameters
 */
export const validateSearch = (): ValidationChain[] => {
  return [
    query('q')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-_.,!?@#$%^&*()]+$/)
      .withMessage('Search query contains invalid characters'),
    query('filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object')
  ];
};

/**
 * Validate date range
 */
export const validateDateRange = (startField: string = 'startDate', endField: string = 'endDate'): ValidationChain[] => {
  return [
    body(startField)
      .optional()
      .isISO8601()
      .withMessage(`${startField} must be a valid ISO 8601 date`)
      .toDate(),
    body(endField)
      .optional()
      .isISO8601()
      .withMessage(`${endField} must be a valid ISO 8601 date`)
      .toDate()
      .custom((value, { req }) => {
        const startDate = req.body[startField];
        if (startDate && value && new Date(value) <= new Date(startDate)) {
          throw new Error(`${endField} must be after ${startField}`);
        }
        return true;
      })
  ];
};

/**
 * Validate JSON data
 */
export const validateJSON = (field: string, schema?: any): ValidationChain => {
  return body(field)
    .isJSON()
    .withMessage(`${field} must be valid JSON`)
    .custom((value) => {
      try {
        const parsed = JSON.parse(value);
        if (schema) {
          // Basic schema validation could be added here
          // For now, just ensure it's valid JSON
        }
        return true;
      } catch (error) {
        throw new Error(`${field} must be valid JSON format`);
      }
    });
};

/**
 * Validate UUID format
 */
export const validateUUID = (field: string = 'id'): ValidationChain => {
  return param(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`);
};

/**
 * Validate URL format
 */
export const validateURL = (field: string = 'url'): ValidationChain => {
  return body(field)
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage(`${field} must be a valid HTTP or HTTPS URL`);
};

/**
 * Validate phone number format
 */
export const validatePhoneNumber = (field: string = 'phone'): ValidationChain => {
  return body(field)
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage(`${field} must be a valid phone number`)
    .isLength({ min: 10, max: 20 })
    .withMessage(`${field} must be between 10 and 20 characters`);
};

/**
 * Validate role permissions
 */
export const validateRole = (allowedRoles: string[]): ValidationChain => {
  return body('role')
    .optional()
    .isIn(allowedRoles)
    .withMessage(`Role must be one of: ${allowedRoles.join(', ')}`);
};

/**
 * Validate file metadata
 */
export const validateFileMetadata = (): ValidationChain[] => {
  return [
    body('filename')
      .optional()
      .isLength({ min: 1, max: 255 })
      .withMessage('Filename must be between 1 and 255 characters')
      .matches(/^[a-zA-Z0-9\s\-_.,()]+$/)
      .withMessage('Filename contains invalid characters'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
  ];
};

/**
 * Validate API key format
 */
export const validateApiKey = (field: string = 'apiKey'): ValidationChain => {
  return body(field)
    .isLength({ min: 32, max: 128 })
    .withMessage(`${field} must be between 32 and 128 characters`)
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage(`${field} contains invalid characters`);
};

/**
 * Validate IP address
 */
export const validateIPAddress = (field: string = 'ip'): ValidationChain => {
  return body(field)
    .isIP()
    .withMessage(`${field} must be a valid IP address`);
};

/**
 * Validate timezone
 */
export const validateTimezone = (field: string = 'timezone'): ValidationChain => {
  return body(field)
    .optional()
    .isIn([
      'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
      'Australia/Sydney', 'Pacific/Auckland'
    ])
    .withMessage(`${field} must be a valid timezone`);
};

/**
 * Validate color code (hex)
 */
export const validateColorCode = (field: string = 'color'): ValidationChain => {
  return body(field)
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage(`${field} must be a valid hex color code`);
};

/**
 * Validate coordinates
 */
export const validateCoordinates = (latField: string = 'latitude', lngField: string = 'longitude'): ValidationChain[] => {
  return [
    body(latField)
      .isFloat({ min: -90, max: 90 })
      .withMessage(`${latField} must be between -90 and 90`),
    body(lngField)
      .isFloat({ min: -180, max: 180 })
      .withMessage(`${lngField} must be between -180 and 180`)
  ];
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000): ValidationChain => {
  return body('rateLimit')
    .optional()
    .custom((value, { req }) => {
      // This would typically be handled by rate limiting middleware
      // but we can validate the rate limit configuration
      if (value && (value.maxRequests > maxRequests || value.windowMs > windowMs)) {
        throw new Error(`Rate limit exceeds maximum allowed values`);
      }
      return true;
    });
};

/**
 * Comprehensive validation middleware factory
 */
export const createValidationMiddleware = (validations: ValidationChain[]) => {
  return [
    sanitizeInput,
    ...validations,
    handleValidationErrors
  ];
};

/**
 * Common validation sets for different operations
 */
export const commonValidations = {
  // User registration
  userRegistration: createValidationMiddleware([
    validateEmail(),
    validatePassword(),
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s\-']+$/)
      .withMessage('First name contains invalid characters'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s\-']+$/)
      .withMessage('Last name contains invalid characters'),
    validateRole(['analyst', 'viewer'])
  ]),

  // User login
  userLogin: createValidationMiddleware([
    validateEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ]),

  // Password change
  passwordChange: createValidationMiddleware([
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    validatePassword('newPassword')
  ]),

  // File upload
  fileUpload: createValidationMiddleware([
    validateFileUpload(10, ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv'])
  ]),

  // Pagination
  pagination: createValidationMiddleware([
    ...validatePagination()
  ]),

  // Search
  search: createValidationMiddleware([
    ...validateSearch()
  ]),

  // Date range
  dateRange: createValidationMiddleware([
    ...validateDateRange()
  ])
};

/**
 * Dynamic validation based on request type
 */
export const dynamicValidation = (req: Request, res: Response, next: NextFunction): void => {
  const contentType = req.get('Content-Type');
  
  // Validate JSON content type
  if (req.method !== 'GET' && req.method !== 'DELETE' && contentType && !contentType.includes('application/json')) {
    next(new ValidationError(
      'Content-Type must be application/json',
      'Content-Type',
      { requestId: req.headers['x-request-id'] as string }
    ));
    return;
  }
  
  next();
};

/**
 * Validate request size
 */
export const validateRequestSize = (maxSizeMB: number = 10) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (contentLength > maxSizeBytes) {
      next(new ValidationError(
        `Request size exceeds maximum allowed size of ${maxSizeMB}MB`,
        'Content-Length',
        { requestId: req.headers['x-request-id'] as string }
      ));
      return;
    }
    
    next();
  };
};
