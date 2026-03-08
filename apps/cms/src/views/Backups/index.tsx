import React, { useState, useEffect, useCallback, useRef, Component } from 'react';

// ── Types (matches BackupHealthV2 from the backend) ─────────────────────────

interface FullBackupInfo {
  date: string;
  mongoFile: string | null;
  mongoSizeMB: number;
  uploadsSnapshot?: string;
  collections: Record<string, number>;
  failures: number;
  timestamp: string | null;
}

interface IncrementalInfo {
  timestamp: string;
  since: string;
  mongoChangedDocs: number;
  mongoChangedCollections: number;
  uploadsChangedFiles: number;
}

interface CollectionBackupInfo {
  collection: string;
  latestFile: string | null;
  latestTimestamp: string | null;
  latestSizeMB: number;
  documentCount: number;
  totalBackups: number;
}

interface UploadsSnapshotInfo {
  timestamp: string;
  snapshotFiles: number;
  newOrChangedFiles: number;
  diskUsageMB: number;
}

interface DownloadableFile {
  filename: string;
  path: string;
  sizeMB: number;
  sizeBytes: number;
  timestamp: string | null;
  ageHours: number;
  type: string;
}

interface BackupHealthV2 {
  version?: number;
  backupRoot?: string;
  backupRootExists?: boolean;
  fullBackups?: FullBackupInfo[];
  lastFullBackup?: FullBackupInfo | null;
  lastFullAge?: string | null;
  incrementalCount?: number;
  lastIncremental?: IncrementalInfo | null;
  lastIncrementalAge?: string | null;
  recentIncrementals?: IncrementalInfo[];
  collectionBackups?: CollectionBackupInfo[];
  uploadsSnapshots?: UploadsSnapshotInfo[];
  lastUploadsSnapshot?: UploadsSnapshotInfo | null;
  lastBackupStatus?: string;
  lastVerificationStatus?: string;
  nextScheduledRun?: string | null;
  cronInstalled?: boolean;
  diskUsage?: Record<string, string>;
  totalDiskUsage?: string;
  warnings?: string[];
  downloadableFiles?: DownloadableFile[];
}

// ── Safe accessor helpers (prevent crashes on missing data) ──────────────────

const safeArr = <T,>(arr: T[] | undefined | null): T[] => Array.isArray(arr) ? arr : [];
const safeObj = (obj: Record<string, string> | undefined | null): Record<string, string> => (obj && typeof obj === 'object') ? obj : {};
const safeStr = (val: string | undefined | null, fallback = '\u2014'): string => val ?? fallback;
const safeNum = (val: number | undefined | null, fallback = 0): number => val ?? fallback;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtSize(mb: number | undefined | null): string {
  const v = safeNum(mb);
  if (v >= 1024) return `${(v / 1024).toFixed(2)} GB`;
  if (v >= 1) return `${v.toFixed(2)} MB`;
  return `${(v * 1024).toFixed(0)} KB`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try { return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

// ── Error Boundary ───────────────────────────────────────────────────────────

class BackupErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) { return { error: err.message || 'Unknown error' }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, maxWidth: 700, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '24px 32px', marginBottom: 16 }}>
            <h2 style={{ color: '#f87171', fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>Backup Manager Error</h2>
            <p style={{ color: '#fca5a5', fontSize: 13, margin: '0 0 12px 0' }}>The backup page encountered an error and could not render.</p>
            <pre style={{ background: '#1a1a2e', color: '#fb923c', padding: 12, borderRadius: 8, fontSize: 11, textAlign: 'left', overflow: 'auto', maxHeight: 120 }}>{this.state.error}</pre>
          </div>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Shared Styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#1a1a2e', borderRadius: 12, padding: '16px 18px',
  border: '1px solid rgba(255,255,255,0.06)',
};
const badge = (color: string, bg: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 999,
  fontSize: 11, fontWeight: 600, color, background: bg,
});
const btnBase: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
  fontFamily: 'inherit',
};
const btnPrimary: React.CSSProperties = { ...btnBase, borderColor: '#3b82f6', background: 'rgba(59,130,246,0.12)', color: '#60a5fa' };
const btnPurple: React.CSSProperties = { ...btnBase, borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.08)', color: '#a78bfa' };
const btnGreen: React.CSSProperties = { ...btnBase, borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)', color: '#4ade80' };
const btnGhost: React.CSSProperties = { ...btnBase, borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' };
const btnOrange: React.CSSProperties = { ...btnBase, borderColor: 'rgba(251,146,60,0.4)', background: 'rgba(251,146,60,0.08)', color: '#fb923c' };

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontWeight: 600,
  color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.06)',
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
};
const tdStyle: React.CSSProperties = {
  padding: '7px 12px', color: '#cbd5e1', fontSize: 12,
  borderBottom: '1px solid rgba(255,255,255,0.03)',
};
const monoTd: React.CSSProperties = { ...tdStyle, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 11 };

// ── Status Badges ────────────────────────────────────────────────────────────

function BackupStatusBadge({ status }: { status: string | undefined }) {
  const m: Record<string, [string, string, string]> = {
    success: ['Success', '#4ade80', 'rgba(34,197,94,0.12)'],
    failure: ['Failed', '#f87171', 'rgba(239,68,68,0.12)'],
    unknown: ['Unknown', '#94a3b8', 'rgba(148,163,184,0.1)'],
  };
  const [t, c, b] = m[status ?? 'unknown'] || m.unknown;
  return <span style={badge(c, b)}>{t}</span>;
}

function VerifyStatusBadge({ status }: { status: string | undefined }) {
  const m: Record<string, [string, string, string]> = {
    passed: ['Passed', '#4ade80', 'rgba(34,197,94,0.12)'],
    failed: ['Failed', '#f87171', 'rgba(239,68,68,0.12)'],
    never_run: ['Never Run', '#fbbf24', 'rgba(251,191,36,0.12)'],
  };
  const [t, c, b] = m[status ?? 'never_run'] || m.never_run;
  return <span style={badge(c, b)}>{t}</span>;
}

// ── Script Output Modal ──────────────────────────────────────────────────────

function ScriptOutputModal({ output, title, running, onClose }: { output: string; title: string; running: boolean; onClose: () => void }) {
  const preRef = useRef<HTMLPreElement>(null);
  useEffect(() => { if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight; }, [output]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0f0f23', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {running && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite', boxShadow: '0 0 8px #4ade80' }} />}
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{title}</h3>
          </div>
          <button onClick={onClose} disabled={running} style={{ ...btnGhost, opacity: running ? 0.3 : 1 }}>Close</button>
        </div>
        <pre ref={preRef} style={{ flex: 1, overflow: 'auto', padding: 20, margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, lineHeight: 1.6, color: '#a3e635', background: '#0a0a1a', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {output || (running ? 'Waiting for output...' : 'No output.')}
        </pre>
      </div>
    </div>
  );
}

// ── Inner Component (wrapped by error boundary) ─────────────────────────────

const BackupManagerInner: React.FC = () => {
  const [data, setData] = useState<BackupHealthV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scriptRunning, setScriptRunning] = useState<string | null>(null);
  const [scriptOutput, setScriptOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [activeTab, setActiveTab] = useState<'full' | 'incremental' | 'collections' | 'uploads' | 'files'>('full');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/internal/backups');
      if (res.status === 403) { setError('Admin access required. Please log in.'); setLoading(false); return; }
      if (!res.ok) { setError(`Failed to fetch: HTTP ${res.status}`); setLoading(false); return; }
      const json = await res.json();
      setData(json ?? {});
      setError('');
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runScript = useCallback(async (endpoint: string, label: string) => {
    if (scriptRunning) return;
    setScriptRunning(label);
    setScriptOutput('');
    setShowOutput(true);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.status === 409) {
        const d = await res.json();
        setScriptOutput(`ERROR: ${d?.error ?? 'Conflict'}\n`);
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
        const { value, done: d } = await reader.read();
        done = d;
        if (value) setScriptOutput((p) => p + decoder.decode(value, { stream: !done }));
      }
    } catch (e: any) {
      setScriptOutput((p) => p + `\nERROR: ${e.message}\n`);
    } finally {
      setScriptRunning(null);
      setTimeout(fetchData, 1500);
    }
  }, [scriptRunning, fetchData]);

  // Safe data accessors
  const fullBackups = safeArr(data?.fullBackups);
  const recentIncrementals = safeArr(data?.recentIncrementals);
  const collectionBackups = safeArr(data?.collectionBackups);
  const uploadsSnapshots = safeArr(data?.uploadsSnapshots);
  const downloadableFiles = safeArr(data?.downloadableFiles);
  const warnings = safeArr(data?.warnings);
  const diskUsage = safeObj(data?.diskUsage);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1320, margin: '0 auto', color: '#e2e8f0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/admin" style={{ ...btnGhost, textDecoration: 'none', fontSize: 12 }}>&larr; Dashboard</a>
          <h1 style={{ fontSize: 22, fontWeight: 750, margin: 0, color: '#f1f5f9', letterSpacing: '-0.03em' }}>Backup Manager</h1>
          {data?.cronInstalled && <span style={badge('#4ade80', 'rgba(34,197,94,0.12)')}>Cron Active</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={fetchData} style={btnGhost}>Refresh</button>
          <button onClick={() => runScript('/api/internal/backups/run', 'Full Backup')} disabled={!!scriptRunning} style={{ ...btnPrimary, opacity: scriptRunning ? 0.4 : 1 }}>
            {scriptRunning === 'Full Backup' ? 'Running...' : 'Run Backup'}
          </button>
          <button onClick={() => runScript('/api/internal/backups/verify', 'Verify')} disabled={!!scriptRunning} style={{ ...btnPurple, opacity: scriptRunning ? 0.4 : 1 }}>
            {scriptRunning === 'Verify' ? 'Running...' : 'Verify'}
          </button>
          <button onClick={() => runScript('/api/internal/backups/test-full', 'Test Restore')} disabled={!!scriptRunning} style={{ ...btnGreen, opacity: scriptRunning ? 0.4 : 1 }}>
            {scriptRunning === 'Test Restore' ? 'Running...' : 'Test Restore'}
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && !data && <div style={{ textAlign: 'center', padding: 64, color: '#64748b' }}>Loading backup data...</div>}

      {data && (
        <>
          {/* ── Warnings ─────────────────────────────────────── */}
          {warnings.length > 0 && (
            <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', marginBottom: 16 }}>
              {warnings.map((w, i) => <div key={i} style={{ color: '#fbbf24', fontSize: 13 }}>&#9888; {w}</div>)}
            </div>
          )}

          {/* ── Summary Cards ────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, marginBottom: 24 }}>
            <div style={card}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>Last Full Backup</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{safeStr(data.lastFullAge, 'Never')}</div>
              <BackupStatusBadge status={data.lastBackupStatus} />
            </div>
            <div style={card}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>Last Incremental</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{safeStr(data.lastIncrementalAge, 'Never')}</div>
              <span style={{ fontSize: 11, color: '#64748b' }}>{safeNum(data.incrementalCount)} total</span>
            </div>
            <div style={card}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>Verification</div>
              <VerifyStatusBadge status={data.lastVerificationStatus} />
            </div>
            <div style={card}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>Disk Usage</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{safeStr(data.totalDiskUsage, '?')}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                {Object.entries(diskUsage).map(([k, v]) => <span key={k} style={{ marginRight: 8 }}>{k}: {v}</span>)}
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>Backup Dir</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: data.backupRootExists ? '#4ade80' : '#f87171' }}>{data.backupRootExists ? 'Exists' : 'Missing'}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2, fontFamily: 'monospace' }}>{safeStr(data.backupRoot, 'unknown')}</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>Next Scheduled</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{fmtDate(data.nextScheduledRun)}</div>
            </div>
          </div>

          {/* ── Quick Actions ────────────────────────────────── */}
          <div style={{ ...card, marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginRight: 8 }}>Quick Actions:</span>
            <button onClick={() => runScript('/api/internal/backups/run-collections', 'Collections')} disabled={!!scriptRunning} style={{ ...btnGhost, opacity: scriptRunning ? 0.4 : 1 }}>
              Backup Collections
            </button>
            <button onClick={() => runScript('/api/internal/backups/run-uploads', 'Uploads')} disabled={!!scriptRunning} style={{ ...btnGhost, opacity: scriptRunning ? 0.4 : 1 }}>
              Backup Uploads
            </button>
            <button onClick={() => runScript('/api/internal/backups/run-incremental', 'Incremental')} disabled={!!scriptRunning} style={{ ...btnGhost, opacity: scriptRunning ? 0.4 : 1 }}>
              Run Incremental
            </button>
            <button onClick={() => runScript('/api/internal/backups/test-uploads', 'Test Uploads')} disabled={!!scriptRunning} style={{ ...btnGreen, opacity: scriptRunning ? 0.4 : 1 }}>
              Test Uploads Snapshot
            </button>
            <button onClick={() => runScript('/api/internal/backups/run-retention?dryRun=true', 'Retention Preview')} disabled={!!scriptRunning} style={{ ...btnOrange, opacity: scriptRunning ? 0.4 : 1 }}>
              Retention Dry Run
            </button>
          </div>

          {/* ── Tab Navigation ───────────────────────────────── */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
            {([['full', 'Full Backups'], ['incremental', 'Incremental'], ['collections', 'Collections'], ['uploads', 'Upload Snapshots'], ['files', 'All Files']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{
                  ...btnBase, border: 'none', borderRadius: '8px 8px 0 0',
                  background: activeTab === key ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: activeTab === key ? '#f1f5f9' : '#64748b',
                  borderBottom: activeTab === key ? '2px solid #3b82f6' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {label}
                {key === 'full' && ` (${fullBackups.length})`}
                {key === 'incremental' && ` (${safeNum(data.incrementalCount)})`}
                {key === 'collections' && ` (${collectionBackups.length})`}
                {key === 'uploads' && ` (${uploadsSnapshots.length})`}
                {key === 'files' && ` (${downloadableFiles.length})`}
              </button>
            ))}
          </div>

          {/* ── Tab Content ──────────────────────────────────── */}

          {activeTab === 'full' && (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {fullBackups.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 13 }}>No full backups found</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={thStyle}>Date</th><th style={thStyle}>Mongo File</th><th style={thStyle}>Mongo Size</th><th style={thStyle}>Collections</th><th style={thStyle}>Status</th><th style={thStyle}>Download</th></tr>
                  </thead>
                  <tbody>
                    {fullBackups.map((b) => (
                      <tr key={b.date}>
                        <td style={monoTd}>{b.date ?? '\u2014'}</td>
                        <td style={monoTd}>{b.mongoFile || '\u2014'}</td>
                        <td style={tdStyle}>{fmtSize(b.mongoSizeMB)}</td>
                        <td style={tdStyle}>{Object.keys(b.collections ?? {}).length} collections</td>
                        <td style={tdStyle}>
                          {b.failures === 0 ? <span style={{ color: '#4ade80', fontWeight: 600, fontSize: 11 }}>OK</span>
                            : b.failures > 0 ? <span style={{ color: '#f87171', fontWeight: 600, fontSize: 11 }}>FAILED ({b.failures})</span>
                            : <span style={{ color: '#64748b', fontSize: 11 }}>?</span>}
                        </td>
                        <td style={tdStyle}>
                          {b.mongoFile && (
                            <button onClick={() => window.open(`/api/internal/backups/download/full/${b.date}/${b.mongoFile}`, '_blank')} style={{ ...btnGhost, padding: '3px 10px', fontSize: 11 }}>
                              Download
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'incremental' && (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {recentIncrementals.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 13 }}>No incremental backups found</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={thStyle}>Timestamp</th><th style={thStyle}>Since</th><th style={thStyle}>Mongo Docs</th><th style={thStyle}>Changed Collections</th><th style={thStyle}>Upload Files</th></tr>
                  </thead>
                  <tbody>
                    {recentIncrementals.map((inc, idx) => (
                      <tr key={inc.timestamp ?? idx}>
                        <td style={monoTd}>{inc.timestamp ?? '\u2014'}</td>
                        <td style={monoTd}>{inc.since ? inc.since.replace('T', ' ').replace('Z', '') : '\u2014'}</td>
                        <td style={tdStyle}>{safeNum(inc.mongoChangedDocs)}</td>
                        <td style={tdStyle}>{safeNum(inc.mongoChangedCollections)}</td>
                        <td style={tdStyle}>{safeNum(inc.uploadsChangedFiles)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'collections' && (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {collectionBackups.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 13 }}>No collection backups found</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={thStyle}>Collection</th><th style={thStyle}>Latest File</th><th style={thStyle}>Size</th><th style={thStyle}>Documents</th><th style={thStyle}>Total Backups</th><th style={thStyle}>Download</th></tr>
                  </thead>
                  <tbody>
                    {collectionBackups.map((cb) => (
                      <tr key={cb.collection}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{cb.collection ?? '\u2014'}</td>
                        <td style={monoTd}>{cb.latestFile || '\u2014'}</td>
                        <td style={tdStyle}>{fmtSize(cb.latestSizeMB)}</td>
                        <td style={tdStyle}>{cb.documentCount || '\u2014'}</td>
                        <td style={tdStyle}>{safeNum(cb.totalBackups)}</td>
                        <td style={tdStyle}>
                          {cb.latestFile && (
                            <button onClick={() => window.open(`/api/internal/backups/download/collections/${cb.collection}/${cb.latestFile}`, '_blank')} style={{ ...btnGhost, padding: '3px 10px', fontSize: 11 }}>
                              Download
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'uploads' && (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {uploadsSnapshots.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 13 }}>No upload snapshots found</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={thStyle}>Timestamp</th><th style={thStyle}>Files</th><th style={thStyle}>Changed</th><th style={thStyle}>Disk Usage</th></tr>
                  </thead>
                  <tbody>
                    {uploadsSnapshots.map((snap, idx) => (
                      <tr key={snap.timestamp ?? idx}>
                        <td style={monoTd}>{snap.timestamp ?? '\u2014'}</td>
                        <td style={tdStyle}>{safeNum(snap.snapshotFiles).toLocaleString()}</td>
                        <td style={tdStyle}>{safeNum(snap.newOrChangedFiles)}</td>
                        <td style={tdStyle}>{fmtSize(snap.diskUsageMB)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {downloadableFiles.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 13 }}>No downloadable files found</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={thStyle}>File</th><th style={thStyle}>Type</th><th style={thStyle}>Size</th><th style={thStyle}>Created</th><th style={thStyle}>Download</th></tr>
                  </thead>
                  <tbody>
                    {downloadableFiles.map((f, idx) => (
                      <tr key={f.path ?? idx}>
                        <td style={monoTd}>{f.filename ?? '\u2014'}</td>
                        <td style={tdStyle}><span style={badge(f.type === 'full' ? '#60a5fa' : '#a78bfa', f.type === 'full' ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.1)')}>{f.type ?? '?'}</span></td>
                        <td style={tdStyle}>{fmtSize(f.sizeMB)}</td>
                        <td style={tdStyle}>{fmtDate(f.timestamp)}</td>
                        <td style={tdStyle}>
                          {f.path && <button onClick={() => window.open(`/api/internal/backups/download/${f.path}`, '_blank')} style={{ ...btnGhost, padding: '3px 10px', fontSize: 11 }}>Download</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Script Output Modal ──────────────────────────── */}
      {showOutput && (
        <ScriptOutputModal
          output={scriptOutput}
          title={scriptRunning ? `Running: ${scriptRunning}...` : 'Script Output'}
          running={!!scriptRunning}
          onClose={() => { if (!scriptRunning) setShowOutput(false); }}
        />
      )}
    </div>
  );
};

// ── Exported Component (wrapped in error boundary) ───────────────────────────

const AdminBackupsPage: React.FC = () => (
  <BackupErrorBoundary>
    <BackupManagerInner />
  </BackupErrorBoundary>
);

export default AdminBackupsPage;
