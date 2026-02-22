/**
 * Error handling utilities for CMS server
 */

import { Response } from 'express';
import { logger } from './logger';

export class CmsError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CmsError';
  }

  static badRequest(message: string, details?: unknown): CmsError {
    return new CmsError(message, 400, 'BAD_REQUEST', details);
  }

  static notFound(message: string = 'Resource not found'): CmsError {
    return new CmsError(message, 404, 'NOT_FOUND');
  }

  static internal(message: string = 'Internal server error'): CmsError {
    return new CmsError(message, 500, 'INTERNAL_ERROR');
  }

  static payloadError(message: string, error: unknown): CmsError {
    return new CmsError(message, 500, 'PAYLOAD_ERROR', error);
  }

  static importError(message: string, details?: unknown): CmsError {
    return new CmsError(message, 500, 'IMPORT_ERROR', details);
  }
}

/**
 * Wrap async functions with error handling
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error('Async handler error', 'ErrorHandler', error);
      throw error;
    }
  };
}

/**
 * Send error response to client
 */
export function sendErrorResponse(res: Response, error: unknown): void {
  if (error instanceof CmsError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  if (error instanceof Error) {
    logger.error('Unhandled error', 'ErrorHandler', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
    return;
  }

  logger.error('Unknown error type', 'ErrorHandler', error);
  res.status(500).json({
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  });
}

/**
 * Wrap Express route handlers with error handling
 */
export function catchErrors(
  handler: (req: any, res: Response) => Promise<void>
) {
  return async (req: any, res: Response): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error) {
      sendErrorResponse(res, error);
    }
  };
}

/**
 * Safe async operation wrapper with fallback
 */
export async function trySafe<T>(
  operation: () => Promise<T>,
  fallback: T,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (context) {
      logger.warn(`Safe operation failed in ${context}`, 'ErrorHandler', error);
    }
    return fallback;
  }
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    context?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    context = 'operation',
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${maxRetries} for ${context}`, 'Retry');
      return await operation();
    } catch (error) {
      lastError = error as Error;
      logger.warn(
        `Attempt ${attempt}/${maxRetries} failed for ${context}`,
        'Retry',
        error
      );

      if (attempt < maxRetries) {
        logger.debug(`Retrying in ${delay}ms...`, 'Retry');
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  throw new CmsError(
    `${context} failed after ${maxRetries} attempts: ${lastError?.message}`,
    500,
    'RETRY_EXHAUSTED',
    { lastError }
  );
}

/**
 * Validate required fields in an object
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[],
  context: string = 'data'
): void {
  const missing = requiredFields.filter((field) => !data[field]);

  if (missing.length > 0) {
    throw CmsError.badRequest(
      `Missing required fields in ${context}: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Global unhandled rejection handler
 */
export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', 'Global', {
      reason,
      promise,
    });
    // Don't exit process - log and continue
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', 'Global', error);
    // Log and exit - uncaught exceptions are serious
    process.exit(1);
  });
}
