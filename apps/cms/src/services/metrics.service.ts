/**
 * Metrics Service — collects system, MongoDB, Redis, PM2, disk, and HTTP metrics.
 * All collection is non-blocking. Graceful fallback if Redis/PM2 unavailable.
 * Results cached for 5 seconds to avoid expensive repeated calls.
 */
import os from 'os';
import { exec } from 'child_process';
import { getHttpMetrics } from '../middleware/http-metrics';
import { createLogger } from './logger';

const log = createLogger('metrics');

// --- Cache ---
let cachedMetrics: FullMetrics | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5000;

// --- Event loop lag measurement ---
let eventLoopLagMs = 0;
function measureEventLoopLag(): void {
  const start = process.hrtime.bigint();
  setImmediate(() => {
    const delta = Number(process.hrtime.bigint() - start) / 1e6;
    eventLoopLagMs = Math.round(delta * 100) / 100;
  });
}
setInterval(measureEventLoopLag, 2000);
measureEventLoopLag();

// --- CPU usage tracking ---
let prevCpuUsage = process.cpuUsage();
let prevCpuTime = Date.now();
let cpuPercent = 0;

function measureCpu(): void {
  const now = Date.now();
  const elapsed = (now - prevCpuTime) * 1000; // microseconds
  const usage = process.cpuUsage(prevCpuUsage);
  const totalUsage = usage.user + usage.system;
  cpuPercent = Math.min(100, Math.round((totalUsage / elapsed) * 100 * 100) / 100);
  prevCpuUsage = process.cpuUsage();
  prevCpuTime = now;
}
setInterval(measureCpu, 2000);
measureCpu();

// --- Types ---
export interface SystemMetrics {
  cpuPercent: number;
  loadAvg: number[];
  memTotalMB: number;
  memFreeMB: number;
  memUsedMB: number;
  memUsedPct: number;
  processMemMB: number;
  processHeapMB: number;
  uptimeSeconds: number;
  nodeVersion: string;
  platform: string;
  eventLoopLagMs: number;
}

export interface DiskMetrics {
  totalGB: number;
  usedGB: number;
  availGB: number;
  usedPct: number;
}

export interface HttpMetrics {
  activeRequests: number;
  totalRequests: number;
  totalErrors: number;
  rateLimitHits: number;
  requestsPerSec: number;
  errorsPerSec: number;
}

export interface MongoMetrics {
  connections: number;
  availableConnections: number;
  opsPerSec: number;
  storageSizeMB: number;
  dataSize: number;
  collections: number;
  ok: boolean;
}

export interface RedisMetrics {
  connected: boolean;
  usedMemoryMB: number;
  connectedClients: number;
  uptimeSeconds: number;
  opsPerSec: number;
}

export interface Pm2Process {
  name: string;
  pid: number;
  status: string;
  cpu: number;
  memoryMB: number;
  uptime: number;
  restarts: number;
}

export interface Pm2Metrics {
  available: boolean;
  processes: Pm2Process[];
}

export interface FullMetrics {
  timestamp: number;
  system: SystemMetrics;
  disk: DiskMetrics;
  http: HttpMetrics;
  mongo: MongoMetrics;
  redis: RedisMetrics;
  pm2: Pm2Metrics;
}

// --- Collectors ---

function collectSystem(): SystemMetrics {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const procMem = process.memoryUsage();

  return {
    cpuPercent,
    loadAvg: os.loadavg(),
    memTotalMB: Math.round(totalMem / 1048576),
    memFreeMB: Math.round(freeMem / 1048576),
    memUsedMB: Math.round(usedMem / 1048576),
    memUsedPct: Math.round((usedMem / totalMem) * 10000) / 100,
    processMemMB: Math.round(procMem.rss / 1048576),
    processHeapMB: Math.round(procMem.heapUsed / 1048576),
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    platform: `${os.type()} ${os.release()}`,
    eventLoopLagMs,
  };
}

async function collectDisk(): Promise<DiskMetrics> {
  return new Promise((resolve) => {
    const fallback: DiskMetrics = { totalGB: 0, usedGB: 0, availGB: 0, usedPct: 0 };
    const cmd = os.platform() === 'win32' ? 'wmic logicaldisk get size,freespace' : 'df -k / | tail -1';

    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) { resolve(fallback); return; }
      try {
        if (os.platform() === 'win32') {
          const lines = stdout.trim().split('\n').slice(1);
          let totalKB = 0, freeKB = 0;
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              freeKB += parseInt(parts[0]) / 1024 || 0;
              totalKB += parseInt(parts[1]) / 1024 || 0;
            }
          }
          const usedKB = totalKB - freeKB;
          resolve({
            totalGB: Math.round(totalKB / 1048576 * 100) / 100,
            usedGB: Math.round(usedKB / 1048576 * 100) / 100,
            availGB: Math.round(freeKB / 1048576 * 100) / 100,
            usedPct: totalKB > 0 ? Math.round((usedKB / totalKB) * 10000) / 100 : 0,
          });
        } else {
          const parts = stdout.trim().split(/\s+/);
          const totalKB = parseInt(parts[1]) || 0;
          const usedKB = parseInt(parts[2]) || 0;
          const availKB = parseInt(parts[3]) || 0;
          resolve({
            totalGB: Math.round(totalKB / 1048576 * 100) / 100,
            usedGB: Math.round(usedKB / 1048576 * 100) / 100,
            availGB: Math.round(availKB / 1048576 * 100) / 100,
            usedPct: totalKB > 0 ? Math.round((usedKB / totalKB) * 10000) / 100 : 0,
          });
        }
      } catch {
        resolve(fallback);
      }
    });
  });
}

async function collectMongo(): Promise<MongoMetrics> {
  const fallback: MongoMetrics = {
    connections: 0, availableConnections: 0, opsPerSec: 0,
    storageSizeMB: 0, dataSize: 0, collections: 0, ok: false,
  };
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection?.db;
    if (!db) return fallback;

    const [serverStatus, dbStats] = await Promise.all([
      db.command({ serverStatus: 1 }).catch(() => null),
      db.stats().catch(() => null),
    ]);

    const conns = serverStatus?.connections || {};
    const ops = serverStatus?.opcounters || {};
    const totalOps = (ops.insert || 0) + (ops.query || 0) + (ops.update || 0) + (ops.delete || 0) + (ops.command || 0);

    return {
      connections: conns.current || 0,
      availableConnections: conns.available || 0,
      opsPerSec: totalOps, // cumulative, delta computed client-side
      storageSizeMB: dbStats ? Math.round((dbStats.storageSize || 0) / 1048576) : 0,
      dataSize: dbStats ? Math.round((dbStats.dataSize || 0) / 1048576) : 0,
      collections: dbStats?.collections || 0,
      ok: true,
    };
  } catch (e: any) {
    log.debug({ error: e.message }, 'Mongo metrics unavailable');
    return fallback;
  }
}

async function collectRedis(): Promise<RedisMetrics> {
  const fallback: RedisMetrics = { connected: false, usedMemoryMB: 0, connectedClients: 0, uptimeSeconds: 0, opsPerSec: 0 };
  try {
    const net = require('net');
    return await new Promise<RedisMetrics>((resolve) => {
      const client = new net.Socket();
      let data = '';
      client.setTimeout(2000);
      client.connect(6379, '127.0.0.1', () => {
        client.write('INFO\r\n');
      });
      client.on('data', (chunk: Buffer) => {
        data += chunk.toString();
        if (data.includes('\r\n\r\n') || data.length > 8000) {
          client.destroy();
          const get = (key: string) => {
            const m = data.match(new RegExp(`${key}:(\\d+)`));
            return m ? parseInt(m[1]) : 0;
          };
          resolve({
            connected: true,
            usedMemoryMB: Math.round(get('used_memory') / 1048576 * 100) / 100,
            connectedClients: get('connected_clients'),
            uptimeSeconds: get('uptime_in_seconds'),
            opsPerSec: get('instantaneous_ops_per_sec'),
          });
        }
      });
      client.on('error', () => { client.destroy(); resolve(fallback); });
      client.on('timeout', () => { client.destroy(); resolve(fallback); });
    });
  } catch {
    return fallback;
  }
}

async function collectPm2(): Promise<Pm2Metrics> {
  const fallback: Pm2Metrics = { available: false, processes: [] };
  return new Promise((resolve) => {
    exec('pm2 jlist 2>/dev/null', { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) { resolve(fallback); return; }
      try {
        const list = JSON.parse(stdout);
        if (!Array.isArray(list)) { resolve(fallback); return; }
        resolve({
          available: true,
          processes: list.map((p: any) => ({
            name: p.name || 'unknown',
            pid: p.pid || 0,
            status: p.pm2_env?.status || 'unknown',
            cpu: p.monit?.cpu || 0,
            memoryMB: Math.round((p.monit?.memory || 0) / 1048576),
            uptime: p.pm2_env?.pm_uptime ? Math.round((Date.now() - p.pm2_env.pm_uptime) / 1000) : 0,
            restarts: p.pm2_env?.restart_time || 0,
          })),
        });
      } catch {
        resolve(fallback);
      }
    });
  });
}

// --- Public API ---

export async function collectAllMetrics(): Promise<FullMetrics> {
  const now = Date.now();
  if (cachedMetrics && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedMetrics;
  }

  const [disk, mongo, redis, pm2] = await Promise.all([
    collectDisk(),
    collectMongo(),
    collectRedis(),
    collectPm2(),
  ]);

  const metrics: FullMetrics = {
    timestamp: now,
    system: collectSystem(),
    disk,
    http: getHttpMetrics(),
    mongo,
    redis,
    pm2,
  };

  cachedMetrics = metrics;
  cacheTimestamp = now;
  return metrics;
}
