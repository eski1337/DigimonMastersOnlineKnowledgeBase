/**
 * Metrics Controller — handles /api/internal/metrics endpoints.
 * No system calls — delegates to services.
 * Admin-only. SSE capped at 10 concurrent clients.
 */
import type { Request, Response } from 'express';
import { collectAllMetrics } from '../services/metrics.service';
import { collectBackupHealth } from '../services/backup-health.service';
import { metricsBuffer, type MetricsSample } from '../services/metrics-buffer';
import { createLogger } from '../services/logger';

const log = createLogger('metrics-ctrl');

// --- SSE connection tracking ---
const MAX_SSE_CLIENTS = 10;
const sseClients = new Set<Response>();

// --- Buffer fill interval (singleton) ---
let bufferInterval: ReturnType<typeof setInterval> | null = null;

export function startMetricsCollection(): void {
  if (bufferInterval) return;
  bufferInterval = setInterval(async () => {
    try {
      const m = await collectAllMetrics();
      const sample: MetricsSample = {
        timestamp: m.timestamp,
        cpu: m.system.cpuPercent,
        memUsedPct: m.system.memUsedPct,
        memUsedMB: m.system.memUsedMB,
        memTotalMB: m.system.memTotalMB,
        diskUsedPct: m.disk.usedPct,
        eventLoopLagMs: m.system.eventLoopLagMs,
        activeRequests: m.http.activeRequests,
        requestsPerSec: m.http.requestsPerSec,
        errorsPerSec: m.http.errorsPerSec,
        rateLimitHits: m.http.rateLimitHits,
        mongoConnections: m.mongo.connections,
        mongoOpsPerSec: m.mongo.opsPerSec,
        redisMemoryMB: m.redis.usedMemoryMB,
        redisClients: m.redis.connectedClients,
      };
      metricsBuffer.push(sample);

      // Broadcast to SSE clients
      const payload = JSON.stringify({ type: 'metrics', data: m, history: metricsBuffer.getAll() });
      for (const client of sseClients) {
        try {
          client.write(`data: ${payload}\n\n`);
        } catch {
          sseClients.delete(client);
        }
      }
    } catch (e: any) {
      log.error({ error: e.message }, 'Metrics collection failed');
    }
  }, 5000);
  log.info('Metrics collection started (5s interval)');
}

export async function getMetrics(_req: Request, res: Response): Promise<void> {
  try {
    const [metrics, backupHealth] = await Promise.all([
      collectAllMetrics(),
      collectBackupHealth(),
    ]);
    res.json({
      metrics,
      history: metricsBuffer.getAll(),
      backupHealth,
    });
  } catch (e: any) {
    log.error({ error: e.message }, 'Failed to collect metrics');
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
}

export function streamMetrics(req: Request, res: Response): void {
  if (sseClients.size >= MAX_SSE_CLIENTS) {
    res.status(429).json({ error: 'Too many SSE connections' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('\n');

  sseClients.add(res);
  log.info({ clients: sseClients.size }, 'SSE client connected');

  // Send initial data immediately
  collectAllMetrics().then((m) => {
    collectBackupHealth().then((bh) => {
      try {
        const payload = JSON.stringify({ type: 'initial', data: m, history: metricsBuffer.getAll(), backupHealth: bh });
        res.write(`data: ${payload}\n\n`);
      } catch { /* client disconnected */ }
    }).catch(() => {});
  }).catch(() => {});

  const cleanup = () => {
    sseClients.delete(res);
    log.info({ clients: sseClients.size }, 'SSE client disconnected');
  };
  req.on('close', cleanup);
  req.on('error', cleanup);
}

export function getSSEClientCount(): number {
  return sseClients.size;
}
