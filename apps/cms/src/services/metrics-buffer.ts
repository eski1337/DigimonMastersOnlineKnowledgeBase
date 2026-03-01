/**
 * Metrics Buffer — Thread-safe circular buffer for historical metrics.
 * Singleton. Max 60 samples at 5-second intervals = 5 minutes of history.
 * No memory growth — fixed-size ring buffer.
 */

export interface MetricsSample {
  timestamp: number;
  cpu: number;
  memUsedPct: number;
  memUsedMB: number;
  memTotalMB: number;
  diskUsedPct: number;
  eventLoopLagMs: number;
  activeRequests: number;
  requestsPerSec: number;
  errorsPerSec: number;
  rateLimitHits: number;
  mongoConnections: number;
  mongoOpsPerSec: number;
  redisMemoryMB: number;
  redisClients: number;
}

const MAX_SAMPLES = 60;

class MetricsBuffer {
  private buffer: MetricsSample[] = [];
  private head = 0;
  private count = 0;

  push(sample: MetricsSample): void {
    if (this.buffer.length < MAX_SAMPLES) {
      this.buffer.push(sample);
    } else {
      this.buffer[this.head] = sample;
    }
    this.head = (this.head + 1) % MAX_SAMPLES;
    this.count = Math.min(this.count + 1, MAX_SAMPLES);
  }

  getAll(): MetricsSample[] {
    if (this.buffer.length < MAX_SAMPLES) {
      return [...this.buffer];
    }
    const ordered: MetricsSample[] = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - this.count + i + MAX_SAMPLES) % MAX_SAMPLES;
      ordered.push(this.buffer[idx]);
    }
    return ordered;
  }

  latest(): MetricsSample | null {
    if (this.count === 0) return null;
    const idx = (this.head - 1 + MAX_SAMPLES) % MAX_SAMPLES;
    return this.buffer[idx];
  }

  size(): number {
    return this.count;
  }
}

// Singleton
export const metricsBuffer = new MetricsBuffer();
