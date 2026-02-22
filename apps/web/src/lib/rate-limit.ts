import { NextRequest, NextResponse } from 'next/server';

interface RateLimitData {
  count: number;
  resetTime: number;
}

// Simple in-memory rate limiter (use Redis in production for multiple instances)
const rateLimitMap = new Map<string, RateLimitData>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (data.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function getRateLimitKey(request: NextRequest): string {
  // Try to get real IP from headers (for reverse proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown';
  
  // Include pathname for per-endpoint limiting
  const pathname = request.nextUrl.pathname;
  
  return `${ip}:${pathname}`;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const data = rateLimitMap.get(key);

  // No previous requests or window expired
  if (!data || data.resetTime < now) {
    const resetTime = now + config.windowMs;
    rateLimitMap.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  // Within window - check if limit exceeded
  if (data.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: data.resetTime };
  }

  // Increment count
  data.count++;
  rateLimitMap.set(key, data);
  
  return {
    allowed: true,
    remaining: config.maxRequests - data.count,
    resetTime: data.resetTime,
  };
}

export function rateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
      },
    }
  );
}
