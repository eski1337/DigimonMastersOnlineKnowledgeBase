import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface BackupFileInfo {
  filename: string;
  sizeMB: number;
  sizeBytes: number;
  timestamp: string | null;
  ageHours: number;
  isStale: boolean;
}

interface RetentionCounts {
  daily: number;
  weekly: number;
  monthly: number;
  total: number;
}

interface BackupHealth {
  lastBackupTime: string | null;
  lastBackupAge: string | null;
  lastBackupSizeMB: number | null;
  lastBackupStatus: 'success' | 'failure' | 'unknown';
  lastVerificationStatus: 'passed' | 'failed' | 'never_run';
  lastVerificationTime: string | null;
  retention: RetentionCounts;
  nextScheduledRun: string | null;
  backupDirExists: boolean;
  uploadsBackupCount: number;
  warnings: string[];
  mongoFiles: BackupFileInfo[];
  uploadsFiles: BackupFileInfo[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
}

function formatAge(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return `${days}d ${rem}h ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, labels }: { status: string; labels: Record<string, { text: string; color: string; bg: string }> }) {
  const cfg = labels[status] || { text: status, color: 'var(--ds-text-tertiary)', bg: 'var(--ds-bg-overlay)' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--ds-radius-full)', fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg }}>
      {cfg.text}
    </span>
  );
}

const backupLabels: Record<string, { text: string; color: string; bg: string }> = {
  success: { text: 'Success', color: 'var(--ds-success)', bg: 'var(--ds-success-subtle)' },
  failure: { text: 'Failed', color: 'var(--ds-error)', bg: 'var(--ds-error-subtle)' },
  unknown: { text: 'Unknown', color: 'var(--ds-text-tertiary)', bg: 'var(--ds-bg-overlay)' },
};

const verifyLabels: Record<string, { text: string; color: string; bg: string }> = {
  passed: { text: 'Passed', color: 'var(--ds-success)', bg: 'var(--ds-success-subtle)' },
  failed: { text: 'Failed', color: 'var(--ds-error)', bg: 'var(--ds-error-subtle)' },
  never_run: { text: 'Never Run', color: 'var(--ds-warning)', bg: 'var(--ds-warning-subtle)' },
};

// ── File Table ───────────────────────────────────────────────────────────────

function BackupTable({ files, type }: { files: BackupFileInfo[]; type: string }) {
  if (files.length === 0) {
    return (
      <div style={{ padding: 32, color: 'var(--ds-text-quaternary)', fontSize: 13, textAlign: 'center', background: 'var(--ds-bg-surface)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-radius-xl)' }}>
        No {type} backups found
      </div>
    );
  }

  const handleDownload = (filename: string) => {
    window.open(`/api/internal/backups/${type}/${filename}`, '_blank');
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontWeight: 600,
    color: 'var(--ds-text-tertiary)', borderBottom: '1px solid var(--ds-border)',
    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
  };
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px', color: 'var(--ds-text-primary)',
    fontFamily: 'var(--ds-font-mono)', fontSize: 12,
    borderBottom: '1px solid var(--ds-border-subtle)',
  };

  return (
    <div style={{ borderRadius: 'var(--ds-radius-xl)', border: '1px solid var(--ds-border)', overflow: 'hidden', background: 'var(--ds-bg-surface)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--ds-bg-surface)' }}>
            <th style={thStyle}>File</th>
            <th style={thStyle}>Size</th>
            <th style={thStyle}>Created</th>
            <th style={thStyle}>Age</th>
            <th style={thStyle}>Status</th>
            <th style={{ ...thStyle, width: 90 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.filename} style={{ transition: 'background 0.1s' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ds-bg-hover)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <td style={tdStyle}>{f.filename}</td>
              <td style={tdStyle}>{formatSize(f.sizeMB)}</td>
              <td style={{ ...tdStyle, fontFamily: 'inherit' }}>{formatDate(f.timestamp)}</td>
              <td style={tdStyle}>{formatAge(f.ageHours)}</td>
              <td style={tdStyle}>
                {f.isStale
                  ? <span style={{ color: 'var(--ds-warning)', fontWeight: 600, fontSize: 11 }}>⚠ Stale</span>
                  : <span style={{ color: 'var(--ds-success)', fontWeight: 600, fontSize: 11 }}>OK</span>
                }
              </td>
              <td style={tdStyle}>
                <button
                  onClick={() => handleDownload(f.filename)}
                  style={{
                    padding: '4px 12px', borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-border-strong)', background: 'var(--ds-bg-elevated)',
                    color: 'var(--ds-text-primary)', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ds-border-hover)'; e.currentTarget.style.background = 'var(--ds-bg-overlay)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-border-strong)'; e.currentTarget.style.background = 'var(--ds-bg-elevated)'; }}
                >
                  Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Script Output Modal ──────────────────────────────────────────────────────

function ScriptOutput({ output, title, onClose }: { output: string; title: string; onClose: () => void }) {
  const preRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight;
  }, [output]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      zIndex: 10000, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'var(--ds-bg-app)', borderRadius: 'var(--ds-radius-2xl)',
        border: '1px solid var(--ds-border)',
        width: '100%', maxWidth: 800, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--ds-shadow-xl)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--ds-border)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ds-text-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              padding: '4px 12px', borderRadius: 'var(--ds-radius-md)',
              border: '1px solid var(--ds-border-strong)', background: 'var(--ds-bg-elevated)',
              color: 'var(--ds-text-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
        <pre
          ref={preRef}
          style={{
            flex: 1, overflow: 'auto', padding: 20, margin: 0,
            fontFamily: 'var(--ds-font-mono)', fontSize: 12,
            color: 'var(--ds-success)',
            background: 'var(--ds-bg-inset)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}
        >
          {output || 'Waiting for output...'}
        </pre>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const AdminBackupsPage: React.FC = () => {
  const [health, setHealth] = useState<BackupHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scriptRunning, setScriptRunning] = useState<string | null>(null);
  const [scriptOutput, setScriptOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/internal/backups');
      if (res.status === 403) { setError('Admin access required'); return; }
      if (!res.ok) { setError('Failed to fetch backup data'); return; }
      const data = await res.json();
      setHealth(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const runScript = async (endpoint: string, label: string) => {
    if (scriptRunning) return;
    setScriptRunning(label);
    setScriptOutput('');
    setShowOutput(true);

    try {
      const res = await fetch(endpoint, { method: 'POST' });

      if (res.status === 409) {
        const data = await res.json();
        setScriptOutput(`ERROR: ${data.error}\n`);
        setScriptRunning(null);
        return;
      }

      if (!res.ok || !res.body) {
        setScriptOutput(`ERROR: HTTP ${res.status}\n`);
        setScriptRunning(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const text = decoder.decode(value, { stream: !done });
          setScriptOutput((prev) => prev + text);
        }
      }
    } catch (e: any) {
      setScriptOutput((prev) => prev + `\nERROR: ${e.message}\n`);
    } finally {
      setScriptRunning(null);
      setTimeout(fetchBackups, 1000);
    }
  };

  const btnBase: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 'var(--ds-radius-lg)', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
  };

  return (
    <div className="ds-fade-in" style={{ padding: '32px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/admin" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 'var(--ds-radius-lg)', border: '1px solid var(--ds-border-strong)',
            color: 'var(--ds-text-secondary)', textDecoration: 'none', fontSize: 13,
            transition: 'all 0.1s', background: 'var(--ds-bg-elevated)',
          }}>
            ← Dashboard
          </a>
          <h1 style={{ fontSize: 24, fontWeight: 750, margin: 0, color: 'var(--ds-text-primary)', letterSpacing: '-0.03em' }}>Backup Manager</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchBackups} style={{ ...btnBase, borderColor: 'var(--ds-border-strong)', background: 'var(--ds-bg-elevated)', color: 'var(--ds-text-primary)' }}>
            Refresh
          </button>
          <button
            onClick={() => runScript('/api/internal/backups/run', 'Backup')}
            disabled={!!scriptRunning}
            style={{ ...btnBase, borderColor: 'var(--ds-accent)', background: 'var(--ds-accent-subtle)', color: 'var(--ds-accent)', opacity: scriptRunning ? 0.5 : 1 }}
          >
            {scriptRunning === 'Backup' ? 'Running...' : 'Run Backup Now'}
          </button>
          <button
            onClick={() => runScript('/api/internal/backups/verify', 'Verify')}
            disabled={!!scriptRunning}
            style={{ ...btnBase, borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.08)', color: '#a78bfa', opacity: scriptRunning ? 0.5 : 1 }}
          >
            {scriptRunning === 'Verify' ? 'Running...' : 'Run Verify Now'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--ds-radius-xl)', background: 'var(--ds-error-subtle)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--ds-error)', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ds-text-quaternary)' }}>Loading backup data...</div>
      )}

      {health && (
        <>
          {/* Warnings */}
          {health.warnings.length > 0 && (
            <div style={{ padding: '10px 16px', borderRadius: 'var(--ds-radius-xl)', background: 'var(--ds-error-subtle)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
              {health.warnings.map((w, i) => <div key={i} style={{ color: 'var(--ds-error)', fontSize: 13 }}>⚠ {w}</div>)}
            </div>
          )}

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
            <SummaryCard label="Last Backup" value={health.lastBackupAge || 'Never'}>
              <StatusBadge status={health.lastBackupStatus} labels={backupLabels} />
            </SummaryCard>
            <SummaryCard label="Last Size" value={health.lastBackupSizeMB != null ? formatSize(health.lastBackupSizeMB) : '—'} />
            <SummaryCard label="Verification">
              <StatusBadge status={health.lastVerificationStatus} labels={verifyLabels} />
              {health.lastVerificationTime && <div style={{ fontSize: 10, color: 'var(--ds-text-quaternary)', marginTop: 4 }}>{health.lastVerificationTime}</div>}
            </SummaryCard>
            <SummaryCard label="Retention" value={`${health.retention.total} total`}>
              <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: 'var(--ds-info)' }}>{health.retention.daily}</span> daily · <span style={{ color: 'var(--ds-info)' }}>{health.retention.weekly}</span> weekly · <span style={{ color: 'var(--ds-info)' }}>{health.retention.monthly}</span> monthly
              </div>
            </SummaryCard>
            <SummaryCard label="Next Scheduled" value={health.nextScheduledRun ? formatDate(health.nextScheduledRun) : '—'} />
            <SummaryCard label="Backup Dir" value={health.backupDirExists ? 'Exists' : 'Missing'} valueColor={health.backupDirExists ? 'var(--ds-success)' : 'var(--ds-error)'} />
          </div>

          {/* MongoDB Backups */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-text-primary)', margin: 0 }}>
                MongoDB Backups <span style={{ fontWeight: 400, color: 'var(--ds-text-quaternary)', fontSize: 12 }}>({health.mongoFiles.length})</span>
              </h2>
            </div>
            <BackupTable files={health.mongoFiles} type="mongo" />
          </div>

          {/* Uploads Backups */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-text-primary)', margin: 0 }}>
                Uploads Backups <span style={{ fontWeight: 400, color: 'var(--ds-text-quaternary)', fontSize: 12 }}>({health.uploadsFiles.length})</span>
              </h2>
            </div>
            <BackupTable files={health.uploadsFiles} type="uploads" />
          </div>
        </>
      )}

      {/* Script output modal */}
      {showOutput && (
        <ScriptOutput
          output={scriptOutput}
          title={scriptRunning ? `Running: ${scriptRunning}...` : 'Script Output'}
          onClose={() => { if (!scriptRunning) setShowOutput(false); }}
        />
      )}
    </div>
  );
};

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, valueColor, children }: { label: string; value?: string; valueColor?: string; children?: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--ds-bg-surface)', borderRadius: 'var(--ds-radius-xl)',
      padding: '14px 16px', border: '1px solid var(--ds-border)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--ds-text-quaternary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {value && <div style={{ fontSize: 14, fontWeight: 600, color: valueColor || 'var(--ds-text-primary)', marginBottom: children ? 6 : 0, fontVariantNumeric: 'tabular-nums' }}>{value}</div>}
      {children}
    </div>
  );
}

export default AdminBackupsPage;
