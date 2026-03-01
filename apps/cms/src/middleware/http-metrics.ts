/**
 * HTTP Metrics Middleware — tracks active requests, request rate, error rate, rate limit hits.
 * Singleton counters. No memory growth.
 */
import type { Request, Response, NextFunction } from 'express';

let activeRequests = 0;
let totalRequests = 0;
let totalErrors = 0;
let rateLimitHits = 0;

// Sliding window: count requests in last N seconds
const WINDOW_SEC = 10;
let windowRequests = 0;
let windowErrors = 0;
let windowStart = Date.now();

function resetWindowIfNeeded(): void {
  const now = Date.now();
  if (now - windowStart >= WINDOW_SEC * 1000) {
    windowRequests = 0;
    windowErrors = 0;
    windowStart = now;
  }
}

export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  activeRequests++;
  totalRequests++;
  resetWindowIfNeeded();
  windowRequests++;

  const onFinish = () => {
    activeRequests--;
    if (res.statusCode >= 400) {
      totalErrors++;
      resetWindowIfNeeded();
      windowErrors++;
    }
    if (res.statusCode === 429) {
      rateLimitHits++;
    }
    res.removeListener('finish', onFinish);
    res.removeListener('close', onFinish);
  };

  res.on('finish', onFinish);
  res.on('close', onFinish);
  next();
}

export function getHttpMetrics() {
  resetWindowIfNeeded();
  const elapsed = Math.max((Date.now() - windowStart) / 1000, 1);
  return {
    activeRequests,
    totalRequests,
    totalErrors,
    rateLimitHits,
    requestsPerSec: Math.round((windowRequests / elapsed) * 100) / 100,
    errorsPerSec: Math.round((windowErrors / elapsed) * 100) / 100,
  };
}
