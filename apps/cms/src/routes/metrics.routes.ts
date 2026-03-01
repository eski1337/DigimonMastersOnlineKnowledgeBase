/**
 * Metrics Routes — admin-only, rate-limited server health endpoints.
 * No business logic — wires HTTP → controller.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getMetrics, streamMetrics } from '../controllers/metrics.controller';

// Simple admin-role check via Payload session
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user || !['admin', 'owner'].includes(user.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

// Per-IP rate limit for metrics endpoint (max 30 req/min)
const rateBuckets = new Map<string, { count: number; reset: number }>();
function metricsRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + 60000 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  if (bucket.count > 30) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }
  // Cleanup old buckets periodically
  if (rateBuckets.size > 100) {
    for (const [k, v] of rateBuckets) {
      if (now > v.reset) rateBuckets.delete(k);
    }
  }
  next();
}

export function createMetricsRoutes(): Router {
  const router = Router();

  router.get('/api/internal/metrics', requireAdmin, metricsRateLimit, (req, res) => getMetrics(req, res));
  router.get('/api/internal/metrics/stream', requireAdmin, (req, res) => streamMetrics(req, res));

  return router;
}
