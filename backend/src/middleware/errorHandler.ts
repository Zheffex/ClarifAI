import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

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

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = err;

  // Log error
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // Handle specific MongoDB errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid data provided';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID provided';
  } else if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Send error response
  const response: any = {
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};