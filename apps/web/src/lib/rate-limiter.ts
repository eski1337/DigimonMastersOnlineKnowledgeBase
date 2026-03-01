/**
 * Unified Rate Limiter — Redis-backed with in-memory fallback
 *
 * Single implementation used by both middleware and API route handlers.
 * Redis ensures rate limits are shared across PM2 cluster workers.
 * Falls back to in-memory Map when Redis is unavailable (dev mode).
 */

import { getRedis } from './redis';

// ── Types ──────────────────────────────────────────────────────────

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ── In-memory fallback store ───────────────────────────────────────

interface MemEntry { count: number; resetTime: number; }
const memStore = new Map<string, MemEntry>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memStore) {
      if (v.resetTime < now) memStore.delete(k);
    }
  }, 5 * 60 * 1000);
}

function checkMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || entry.resetTime < now) {
    memStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { success: true, limit: config.maxRequests, remaining: config.maxRequests - 1, reset: now + config.windowMs };
  }

  if (entry.count < config.maxRequests) {
    entry.count++;
    return { success: true, limit: config.maxRequests, remaining: config.maxRequests - entry.count, reset: entry.resetTime };
  }

  return { success: false, limit: config.maxRequests, remaining: 0, reset: entry.resetTime };
}

// ── Redis-backed check (atomic INCR + PEXPIRE) ────────────────────

async function checkRedis(key: string, config: RateLimitConfig): Promise<RateLimitResult | null> {
  try {
    const redis = await getRedis();
    if (!redis) return null;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, config.windowMs);
    }
    const ttl = await redis.pttl(key);
    const reset = Date.now() + Math.max(ttl, 0);
    const remaining = Math.max(config.maxRequests - count, 0);

    return {
      success: count <= config.maxRequests,
      limit: config.maxRequests,
      remaining,
      reset,
    };
  } catch {
    return null; // fall through to in-memory
  }
}

// ── Public API ─────────────────────────────────────────────────────

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
};

/**
 * Check rate limit — tries Redis first, falls back to in-memory.
 */
export async function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {},
): Promise<RateLimitResult> {
  const cfg: RateLimitConfig = {
    maxRequests: config.maxRequests ?? DEFAULT_CONFIG.maxRequests,
    windowMs: config.windowMs ?? DEFAULT_CONFIG.windowMs,
  };

  const redisResult = await checkRedis(`rl:${identifier}`, cfg);
  if (redisResult) return redisResult;

  return checkMemory(identifier, cfg);
}

/**
 * Extract client IP from request headers (proxy-aware).
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'anonymous';
}
