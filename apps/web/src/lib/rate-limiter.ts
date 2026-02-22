/**
 * Lightweight rate limiter for API routes
 * Tracks requests per IP address using in-memory store
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  maxRequests?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {}
): RateLimitResult {
  const maxRequests = config.maxRequests || parseInt(process.env.RATE_LIMIT_MAX || '100');
  const windowMs = config.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');

  const now = Date.now();
  const record = store[identifier];

  // No record or window expired - create new
  if (!record || now > record.resetTime) {
    store[identifier] = {
      count: 1,
      resetTime: now + windowMs,
    };

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: now + windowMs,
    };
  }

  // Within window - check limit
  if (record.count < maxRequests) {
    record.count++;
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - record.count,
      reset: record.resetTime,
    };
  }

  // Rate limit exceeded
  return {
    success: false,
    limit: maxRequests,
    remaining: 0,
    reset: record.resetTime,
  };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return 'anonymous';
}

/**
 * Clean up expired entries periodically
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
