/**
 * Centralized error handling utilities
 */

import { Response } from 'express';
import { logger } from '../services/logger';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(message: string, status: number = 500, code?: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Send error response
 */
export function sendErrorResponse(res: Response, error: Error | AppError, statusCode?: number): void {
  const isAppError = error instanceof AppError;
  const status = statusCode || (isAppError ? error.status : 500);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error
  logger.error({
    message: error.message,
    status,
    code: isAppError ? error.code : undefined,
    stack: isDevelopment ? error.stack : undefined,
    details: isAppError ? error.details : undefined,
  }, 'Request error');

  // Send response
  const errorResponse: any = {
    error: {
      message: error.message,
    },
  };
  
  if (isAppError && error.code) {
    errorResponse.error.code = error.code;
  }
  
  if (isDevelopment && error.stack) {
    errorResponse.error.stack = error.stack;
  }
  
  if (isAppError && error.details) {
    errorResponse.error.details = error.details;
  }
  
  res.status(status).json(errorResponse);
}

/**
 * Async error handler wrapper for Express routes
 */
export function asyncHandler(fn: (...args: any[]) => any) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express error middleware
 */
export function errorMiddleware(err: Error | AppError, req: any, res: Response, _next: any): void {
  sendErrorResponse(res, err);
}
