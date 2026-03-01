/**
 * Centralized error handling middleware.
 * Standard JSON error format. Never leaks stack traces in production.
 */
import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../services/logger';

const log = createLogger('error-handler');

export interface AppError extends Error {
  statusCode?: number;
  data?: any;
}

export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  log.error(
    {
      method: req.method,
      path: req.path,
      statusCode,
      error: err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    },
    `${req.method} ${req.path} failed`,
  );

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(err.data ? { details: err.data } : {}),
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
