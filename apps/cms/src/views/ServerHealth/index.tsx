import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface MetricsSample {
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

interface SystemMetrics {
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

interface DiskMetrics { totalGB: number; usedGB: number; availGB: number; usedPct: number; }
interface HttpMetrics { activeRequests: number; totalRequests: number; totalErrors: number; rateLimitHits: number; requestsPerSec: number; errorsPerSec: number; }
interface MongoMetrics { connections: number; availableConnections: number; opsPerSec: number; storageSizeMB: number; dataSize: number; collections: number; ok: boolean; }
interface RedisMetrics { connected: boolean; usedMemoryMB: number; connectedClients: number; uptimeSeconds: number; opsPerSec: number; }
interface Pm2Process { name: string; pid: number; status: string; cpu: number; memoryMB: number; uptime: number; restarts: number; }
interface Pm2Metrics { available: boolean; processes: Pm2Process[]; }
interface FullMetrics { timestamp: number; system: SystemMetrics; disk: DiskMetrics; http: HttpMetrics; mongo: MongoMetrics; redis: RedisMetrics; pm2: Pm2Metrics; }
interface RetentionCounts { daily: number; weekly: number; monthly: number; total: number; }
interface BackupHealth {
  lastBackupTime: string | null; lastBackupAge: string | null; lastBackupSizeMB: number | null;
  lastBackupStatus: 'success' | 'failure' | 'unknown'; lastVerificationStatus: 'passed' | 'failed' | 'never_run';
  lastVerificationTime: string | null; retention: RetentionCounts;
  nextScheduledRun: string | null; backupDirExists: boolean;
  uploadsBackupCount: number; warnings: string[];
}

// ── Design tokens (CSS var references for inline styles) ─────────────────────

const C = {
  bg: 'var(--ds-bg-app)',
  surface: 'var(--ds-bg-surface)',
  elevated: 'var(--ds-bg-elevated)',
  inset: 'var(--ds-bg-inset)',
  overlay: 'var(--ds-bg-overlay)',
  border: 'var(--ds-border)',
  borderSubtle: 'var(--ds-border-subtle)',
  borderStrong: 'var(--ds-border-strong)',
  text1: 'var(--ds-text-primary)',
  text2: 'var(--ds-text-secondary)',
  text3: 'var(--ds-text-tertiary)',
  text4: 'var(--ds-text-quaternary)',
  accent: 'var(--ds-accent)',
  success: 'var(--ds-success)',
  successSub: 'var(--ds-success-subtle)',
  warning: 'var(--ds-warning)',
  warningSub: 'var(--ds-warning-subtle)',
  error: 'var(--ds-error)',
  errorSub: 'var(--ds-error-subtle)',
  info: 'var(--ds-info)',
  infoSub: 'var(--ds-info-subtle)',
  mono: 'var(--ds-font-mono)',
  radiusLg: 'var(--ds-radius-lg)',
  radiusXl: 'var(--ds-radius-xl)',
  radius2xl: 'var(--ds-radius-2xl)',
};

// ── Inline SVG Charts ────────────────────────────────────────────────────────

const CHART_W = 280;
const CHART_H = 80;
const CHART_PAD = 2;

function MiniLineChart({ data, color, max, label }: { data: number[]; color: string; max?: number; label?: string }) {
  if (data.length < 2) return <div style={{ width: CHART_W, height: CHART_H, background: C.inset, borderRadius: C.radiusLg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text4, fontSize: 11 }}>Collecting data...</div>;
  const effectiveMax = max || Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = CHART_PAD + (i / (data.length - 1)) * (CHART_W - CHART_PAD * 2);
    const y = CHART_H - CHART_PAD - (v / effectiveMax) * (CHART_H - CHART_PAD * 2);
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `${CHART_PAD},${CHART_H - CHART_PAD} ${points} ${CHART_W - CHART_PAD},${CHART_H - CHART_PAD}`;
  const latest = data[data.length - 1];
  return (
    <div style={{ position: 'relative' }}>
      <svg width={CHART_W} height={CHART_H} style={{ background: C.inset, borderRadius: C.radiusLg, display: 'block' }}>
        <polygon points={areaPoints} fill={color} opacity={0.12} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
      {label && <div style={{ position: 'absolute', top: 4, left: 8, fontSize: 10, color: C.text3 }}>{label}</div>}
      <div style={{ position: 'absolute', top: 4, right: 8, fontSize: 12, fontWeight: 700, color }}>{typeof latest === 'number' ? latest.toFixed(1) : latest}</div>
    </div>
  );
}

function GaugeChart({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit?: string }) {
  const pct = Math.min(value / max, 1);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = pct * circumference * 0.75;
  const warnColor = pct > 0.9 ? '#ef4444' : pct > 0.75 ? '#eab308' : color;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={80} height={60} viewBox="0 0 80 60">
        <path d="M 8 52 A 32 32 0 1 1 72 52" fill="none" stroke="var(--ds-border-strong)" strokeWidth={6} strokeLinecap="round" />
        <path d="M 8 52 A 32 32 0 1 1 72 52" fill="none" stroke={warnColor} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`} />
      </svg>
      <div style={{ fontSize: 16, fontWeight: 700, color: warnColor, marginTop: -8 }}>{value.toFixed(1)}{unit || '%'}</div>
      <div style={{ fontSize: 10, color: C.text3 }}>{label}</div>
    </div>
  );
}

// ── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color?: string }) {
  return (
    <div style={{ background: C.surface, borderRadius: C.radiusXl, padding: '12px 16px', minWidth: 130, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 10, color: C.text4, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || C.text1, fontFamily: C.mono, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: C.text4, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, labels }: { status: string; labels: Record<string, { text: string; color: string; bg: string }> }) {
  const cfg = labels[status] || { text: status, color: C.text3, bg: C.overlay };
  return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--ds-radius-full)', fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg }}>{cfg.text}</span>;
}

// ── Backup Status Panel ──────────────────────────────────────────────────────

function BackupStatusPanel({ health }: { health: BackupHealth | null }) {
  if (!health) return <div style={{ padding: 24, color: C.text4, textAlign: 'center' }}>Loading backup health...</div>;

  const backupLabels: Record<string, { text: string; color: string; bg: string }> = {
    success: { text: 'Success', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    failure: { text: 'Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    unknown: { text: 'Unknown', color: '#71717a', bg: 'var(--ds-bg-overlay)' },
  };
  const verifyLabels: Record<string, { text: string; color: string; bg: string }> = {
    passed: { text: 'Passed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    failed: { text: 'Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    never_run: { text: 'Never Run', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  };

  return (
    <div>
      {health.warnings.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: C.radiusXl, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
          {health.warnings.map((w, i) => <div key={i} style={{ color: '#ef4444', fontSize: 13 }}>⚠ {w}</div>)}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ background: C.surface, borderRadius: C.radiusXl, padding: '12px 16px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.text4, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>Last Backup</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, marginBottom: 4 }}>{health.lastBackupAge || 'Never'}</div>
          <StatusBadge status={health.lastBackupStatus} labels={backupLabels} />
        </div>
        <div style={{ background: C.surface, borderRadius: C.radiusXl, padding: '12px 16px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.text4, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>Backup Size</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, fontVariantNumeric: 'tabular-nums' }}>{health.lastBackupSizeMB != null ? `${health.lastBackupSizeMB} MB` : '—'}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: C.radiusXl, padding: '12px 16px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.text4, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>Verification</div>
          <StatusBadge status={health.lastVerificationStatus} labels={verifyLabels} />
          {health.lastVerificationTime && <div style={{ fontSize: 10, color: C.text4, marginTop: 4 }}>{health.lastVerificationTime}</div>}
        </div>
        <div style={{ background: C.surface, borderRadius: C.radiusXl, padding: '12px 16px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.text4, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>Retention</div>
          <div style={{ fontSize: 12, color: C.text2, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#3b82f6' }}>{health.retention.daily}</span> daily &middot;{' '}
            <span style={{ color: '#3b82f6' }}>{health.retention.weekly}</span> weekly &middot;{' '}
            <span style={{ color: '#3b82f6' }}>{health.retention.monthly}</span> monthly
          </div>
          <div style={{ fontSize: 10, color: C.text4, marginTop: 2 }}>{health.retention.total} total backups</div>
        </div>
        <div style={{ background: C.surface, borderRadius: C.radiusXl, padding: '12px 16px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.text4, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>Uploads Backups</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, fontVariantNumeric: 'tabular-nums' }}>{health.uploadsBackupCount}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: C.radiusXl, padding: '12px 16px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.text4, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>Next Scheduled</div>
          <div style={{ fontSize: 12, color: C.text1, fontVariantNumeric: 'tabular-nums' }}>{health.nextScheduledRun ? new Date(health.nextScheduledRun).toLocaleString() : '—'}</div>
        </div>
      </div>
    </div>
  );
}

// ── PM2 Table ────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontWeight: 600,
  color: 'var(--ds-text-tertiary)', borderBottom: '1px solid var(--ds-border)',
  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
};
const tdStyle: React.CSSProperties = {
  padding: '6px 12px', color: 'var(--ds-text-primary)',
  fontFamily: 'var(--ds-font-mono)', fontSize: 12,
};

function Pm2Table({ pm2 }: { pm2: Pm2Metrics | null }) {
  if (!pm2 || !pm2.available || pm2.processes.length === 0) {
    return <div style={{ padding: 16, color: C.text4, fontSize: 13 }}>PM2 not available or no processes running</div>;
  }
  const statusColor = (s: string) => s === 'online' ? '#22c55e' : s === 'errored' ? '#ef4444' : '#eab308';
  return (
    <div style={{ borderRadius: C.radiusXl, border: `1px solid ${C.border}`, overflow: 'hidden', background: C.surface }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.surface }}>
            <th style={thStyle}>Name</th><th style={thStyle}>PID</th><th style={thStyle}>Status</th>
            <th style={thStyle}>CPU</th><th style={thStyle}>Memory</th><th style={thStyle}>Uptime</th><th style={thStyle}>Restarts</th>
          </tr>
        </thead>
        <tbody>
          {pm2.processes.map((p, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
              <td style={tdStyle}>{p.name}</td>
              <td style={{ ...tdStyle, color: C.text3 }}>{p.pid}</td>
              <td style={tdStyle}><span style={{ color: statusColor(p.status), fontWeight: 600 }}>{p.status}</span></td>
              <td style={tdStyle}>{p.cpu}%</td>
              <td style={tdStyle}>{p.memoryMB} MB</td>
              <td style={tdStyle}>{formatUptime(p.uptime)}</td>
              <td style={tdStyle}><span style={{ color: p.restarts > 5 ? '#ef4444' : C.text1 }}>{p.restarts}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
}

// ── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text1, margin: '28px 0 12px', borderBottom: `1px solid ${C.border}`, paddingBottom: 8, letterSpacing: '-0.01em' }}>{title}</h2>;
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

const ServerHealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<FullMetrics | null>(null);
  const [history, setHistory] = useState<MetricsSample[]>([]);
  const [backupHealth, setBackupHealth] = useState<BackupHealth | null>(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) return;
    const es = new EventSource('/api/internal/metrics/stream');
    eventSourceRef.current = es;

    es.onopen = () => { setConnected(true); setError(''); };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.data) setMetrics(payload.data);
        if (payload.history) setHistory(payload.history);
        if (payload.backupHealth) setBackupHealth(payload.backupHealth);
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      eventSourceRef.current = null;
      setTimeout(connectSSE, 5000);
    };
  }, []);

  useEffect(() => {
    fetch('/api/internal/metrics')
      .then((r) => {
        if (r.status === 403) { setError('Admin access required'); return null; }
        if (!r.ok) { setError('Failed to fetch metrics'); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setMetrics(data.metrics);
          setHistory(data.history || []);
          setBackupHealth(data.backupHealth);
          setError('');
        }
      })
      .catch((e) => setError(e.message));

    connectSSE();
    return () => { eventSourceRef.current?.close(); eventSourceRef.current = null; };
  }, [connectSSE]);

  useEffect(() => {
    const iv = setInterval(() => {
      fetch('/api/internal/metrics')
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.backupHealth) setBackupHealth(data.backupHealth); })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const sys = metrics?.system;
  const disk = metrics?.disk;
  const http = metrics?.http;
  const mongo = metrics?.mongo;
  const redis = metrics?.redis;

  return (
    <div className="ds-fade-in" style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/admin" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: C.radiusLg, border: `1px solid ${C.borderStrong}`,
            color: C.text2, textDecoration: 'none', fontSize: 13, background: C.elevated,
            transition: 'all 0.1s',
          }}>← Dashboard</a>
          <h1 style={{ fontSize: 24, fontWeight: 750, margin: 0, color: C.text1, letterSpacing: '-0.03em' }}>Server Health</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: connected ? '#22c55e' : '#ef4444' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', display: 'inline-block', boxShadow: connected ? '0 0 6px rgba(34,197,94,0.4)' : '0 0 6px rgba(239,68,68,0.4)' }} />
            {connected ? 'Live' : 'Disconnected'}
          </span>
          {sys && <span style={{ fontSize: 11, color: C.text4 }}>Uptime: {formatUptime(sys.uptimeSeconds)}</span>}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: C.radiusXl, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      {!metrics && !error && (
        <div style={{ textAlign: 'center', padding: 48, color: C.text4 }}>Loading metrics...</div>
      )}

      {metrics && (
        <>
          {/* Section 1 — System Overview */}
          <SectionHeader title="System Overview" />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <MiniLineChart data={history.map((h) => h.cpu)} color="#ef4444" max={100} label="CPU %" />
            <MiniLineChart data={history.map((h) => h.memUsedPct)} color="#3b82f6" max={100} label="Memory %" />
            <GaugeChart value={disk?.usedPct || 0} max={100} color="#c084fc" label="Disk" />
            <GaugeChart value={sys?.eventLoopLagMs || 0} max={50} color={sys && sys.eventLoopLagMs > 20 ? '#ef4444' : '#22c55e'} label="Loop Lag" unit="ms" />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <MetricCard title="CPU" value={`${sys?.cpuPercent.toFixed(1)}%`} subtitle={`Load: ${sys?.loadAvg.map((v) => v.toFixed(2)).join(' ')}`} color="#ef4444" />
            <MetricCard title="Memory" value={`${sys?.memUsedMB} MB`} subtitle={`${sys?.memUsedPct.toFixed(1)}% of ${sys?.memTotalMB} MB`} color="#3b82f6" />
            <MetricCard title="Process RSS" value={`${sys?.processMemMB} MB`} subtitle={`Heap: ${sys?.processHeapMB} MB`} />
            <MetricCard title="Disk" value={`${disk?.usedGB} GB`} subtitle={`${disk?.usedPct.toFixed(1)}% of ${disk?.totalGB} GB`} color="#c084fc" />
            <MetricCard title="Platform" value={sys?.nodeVersion || ''} subtitle={sys?.platform} />
          </div>

          {/* Section 2 — Traffic */}
          <SectionHeader title="Traffic" />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <MiniLineChart data={history.map((h) => h.requestsPerSec)} color="#22c55e" label="Req/s" />
            <MiniLineChart data={history.map((h) => h.errorsPerSec)} color="#ef4444" label="Err/s" />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <MetricCard title="Active Requests" value={http?.activeRequests || 0} color="#22c55e" />
            <MetricCard title="Req/sec" value={http?.requestsPerSec.toFixed(1) || '0'} color="#22c55e" />
            <MetricCard title="Err/sec" value={http?.errorsPerSec.toFixed(1) || '0'} color={http && http.errorsPerSec > 0 ? '#ef4444' : '#22c55e'} />
            <MetricCard title="Total Requests" value={http?.totalRequests.toLocaleString() || '0'} />
            <MetricCard title="Total Errors" value={http?.totalErrors.toLocaleString() || '0'} color={http && http.totalErrors > 0 ? '#ef4444' : undefined} />
            <MetricCard title="Rate Limit Hits" value={http?.rateLimitHits || 0} color={http && http.rateLimitHits > 0 ? '#eab308' : undefined} />
          </div>

          {/* Section 3 — Database & Cache */}
          <SectionHeader title="Database & Cache" />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <MiniLineChart data={history.map((h) => h.mongoConnections)} color="#f97316" label="Mongo Conns" />
            <MiniLineChart data={history.map((h) => h.redisMemoryMB)} color="#c084fc" label="Redis MB" />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <MetricCard title="Mongo Connections" value={mongo?.connections || 0} subtitle={`${mongo?.availableConnections || 0} available`} color="#f97316" />
            <MetricCard title="Mongo Ops (cumul.)" value={(mongo?.opsPerSec || 0).toLocaleString()} color="#f97316" />
            <MetricCard title="Mongo Storage" value={`${mongo?.storageSizeMB || 0} MB`} subtitle={`Data: ${mongo?.dataSize || 0} MB, ${mongo?.collections || 0} collections`} />
            <MetricCard title="Mongo Status" value={mongo?.ok ? 'OK' : 'Error'} color={mongo?.ok ? '#22c55e' : '#ef4444'} />
            <MetricCard title="Redis Memory" value={`${redis?.usedMemoryMB || 0} MB`} color={redis?.connected ? '#c084fc' : '#ef4444'} />
            <MetricCard title="Redis Clients" value={redis?.connectedClients || 0} subtitle={redis?.connected ? `Up ${formatUptime(redis.uptimeSeconds)}` : 'Disconnected'} color={redis?.connected ? '#c084fc' : '#ef4444'} />
            <MetricCard title="Redis Ops/s" value={redis?.opsPerSec || 0} color="#c084fc" />
          </div>

          {/* Section 4 — PM2 */}
          <SectionHeader title="Process Management (PM2)" />
          <Pm2Table pm2={metrics.pm2} />

          {/* Section 5 — Backup Health */}
          <SectionHeader title="Backup Health" />
          <BackupStatusPanel health={backupHealth} />
        </>
      )}
    </div>
  );
};

export default ServerHealthDashboard;
