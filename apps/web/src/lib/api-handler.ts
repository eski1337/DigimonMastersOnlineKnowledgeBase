import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RateLimitConfig } from './rate-limit';

export interface ApiError {
  error: string;
  details?: unknown;
  code?: string;
}

export type ApiHandler = (req: NextRequest) => Promise<NextResponse>;

/**
 * Wraps API route handlers with rate limiting and consistent error handling
 */
export function withErrorHandler(
  handler: ApiHandler,
  rateLimitConfig?: RateLimitConfig
): ApiHandler {
  return async (req: NextRequest) => {
    try {
      // Apply rate limiting if configured
      if (rateLimitConfig) {
        const key = getRateLimitKey(req);
        const { allowed, remaining, resetTime } = checkRateLimit(key, rateLimitConfig);
        
        if (!allowed) {
          return rateLimitResponse(resetTime);
        }
        
        // Add rate limit headers to all responses
        const response = await handler(req);
        response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
        return response;
      }
      
      return await handler(req);
    } catch (error) {
      console.error('API Error:', error);

      // Zod validation errors
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
            code: 'VALIDATION_ERROR',
          } satisfies ApiError,
          { status: 400 }
        );
      }

      // Custom API errors
      if (error instanceof ApiErrorResponse) {
        return NextResponse.json(
          {
            error: error.message,
            details: error.details,
            code: error.code,
          } satisfies ApiError,
          { status: error.status }
        );
      }

      // Unknown errors
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      return NextResponse.json(
        {
          error: message,
          code: 'INTERNAL_ERROR',
        } satisfies ApiError,
        { status: 500 }
      );
    }
  };
}

/**
 * Custom API error class for throwing typed errors
 */
export class ApiErrorResponse extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiErrorResponse';
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiErrorResponse(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiErrorResponse(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiErrorResponse(message, 403, 'FORBIDDEN');
  }

  static notFound(message: string = 'Not found') {
    return new ApiErrorResponse(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string, details?: unknown) {
    return new ApiErrorResponse(message, 409, 'CONFLICT', details);
  }

  static internal(message: string = 'Internal server error') {
    return new ApiErrorResponse(message, 500, 'INTERNAL_ERROR');
  }
}

/**
 * Validates request body against a Zod schema
 */
export async function validateBody<T>(req: NextRequest, schema: import('zod').ZodSchema<T>): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error; // Will be caught by withErrorHandler
    }
    throw ApiErrorResponse.badRequest('Invalid JSON body');
  }
}

/**
 * Validates URL search params against a Zod schema
 */
export function validateParams<T>(req: NextRequest, schema: import('zod').ZodSchema<T>): T {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return schema.parse(params);
}

/**
 * Helper to create successful API responses
 */
export function apiResponse<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}
