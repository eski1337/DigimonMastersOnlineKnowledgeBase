import React, { useState, useEffect, useCallback } from 'react';

interface LogEntry {
  id: number;
  level: string;
  message: string;
  context?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const LEVEL_COLORS: Record<string, string> = {
  error: '#ef4444',
  warn: '#eab308',
  info: '#3b82f6',
  debug: '#71717a',
};

const LEVEL_BG: Record<string, string> = {
  error: 'rgba(239,68,68,0.06)',
  warn: 'rgba(234,179,8,0.06)',
  info: 'rgba(59,130,246,0.04)',
  debug: 'rgba(113,113,122,0.04)',
};

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [contexts, setContexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Filters
  const [filterLevel, setFilterLevel] = useState('');
  const [filterContext, setFilterContext] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterLevel) params.set('level', filterLevel);
      if (filterContext) params.set('context', filterContext);
      if (filterSearch) params.set('search', filterSearch);
      params.set('limit', '300');

      const res = await fetch(`/api/app-logs?${params.toString()}`);
      if (res.status === 403) {
        setError('Access denied — owner role required');
        setLogs([]);
        return;
      }
      if (!res.ok) {
        setError('Failed to fetch logs');
        return;
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setContexts(data.contexts || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [filterLevel, filterContext, filterSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleClear = async () => {
    if (!confirm('Clear all logs from buffer?')) return;
    await fetch('/api/app-logs', { method: 'DELETE' });
    fetchLogs();
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    } catch {
      return ts;
    }
  };

  const formatDate = (ts: string) => {
    try {
      return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  const selectStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 'var(--ds-radius-lg)',
    border: '1px solid var(--ds-border-strong)',
    background: 'var(--ds-bg-inset)', color: 'var(--ds-text-primary)', fontSize: 13,
  };

  const btnStyle: React.CSSProperties = {
    padding: '6px 14px', borderRadius: 'var(--ds-radius-lg)',
    border: '1px solid var(--ds-border-strong)',
    background: 'var(--ds-bg-elevated)', color: 'var(--ds-text-primary)',
    fontSize: 13, cursor: 'pointer', fontWeight: 600,
    transition: 'all 0.1s',
  };

  const thBase: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'left', fontWeight: 600,
    color: 'var(--ds-text-tertiary)', fontSize: 11,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: '1px solid var(--ds-border)',
  };

  return (
    <div className="ds-fade-in" style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href="/admin"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 'var(--ds-radius-lg)',
              border: '1px solid var(--ds-border-strong)',
              color: 'var(--ds-text-secondary)', textDecoration: 'none', fontSize: 13,
              background: 'var(--ds-bg-elevated)', transition: 'all 0.1s',
            }}
          >
            ← Dashboard
          </a>
          <h1 style={{ fontSize: 24, fontWeight: 750, margin: 0, color: 'var(--ds-text-primary)', letterSpacing: '-0.03em' }}>Application Logs</h1>
          <span style={{ fontSize: 13, color: 'var(--ds-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
            {total} entries in buffer
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ds-text-tertiary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: '#f97316' }}
            />
            Auto-refresh
          </label>
          <button onClick={fetchLogs} style={btnStyle}>Refresh</button>
          <button
            onClick={handleClear}
            style={{ ...btnStyle, borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={selectStyle}>
          <option value="">All Levels</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>

        <select value={filterContext} onChange={(e) => setFilterContext(e.target.value)} style={selectStyle}>
          <option value="">All Contexts</option>
          {contexts.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search logs..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: 200 }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--ds-radius-xl)',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', marginBottom: 16, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Log Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ds-text-quaternary)' }}>Loading logs...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ds-text-quaternary)' }}>
          {error ? '' : 'No log entries found'}
        </div>
      ) : (
        <div style={{ borderRadius: 'var(--ds-radius-xl)', border: '1px solid var(--ds-border)', overflow: 'hidden', background: 'var(--ds-bg-surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--ds-bg-surface)' }}>
                <th style={{ ...thBase, width: 80 }}>Time</th>
                <th style={{ ...thBase, width: 60 }}>Level</th>
                <th style={{ ...thBase, width: 90 }}>Context</th>
                <th style={thBase}>Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      style={{
                        background: LEVEL_BG[log.level] || 'transparent',
                        borderBottom: '1px solid var(--ds-border-subtle)',
                        cursor: log.data ? 'pointer' : 'default',
                        transition: 'background 0.1s',
                      }}
                    >
                      <td style={{ padding: '6px 12px', fontFamily: 'var(--ds-font-mono)', color: 'var(--ds-text-tertiary)', whiteSpace: 'nowrap', fontSize: 12 }}>
                        <span title={log.timestamp}>
                          <span style={{ fontSize: 10, color: 'var(--ds-text-quaternary)' }}>{formatDate(log.timestamp)} </span>
                          {formatTime(log.timestamp)}
                        </span>
                      </td>
                      <td style={{ padding: '6px 12px' }}>
                        <span style={{
                          display: 'inline-block', padding: '1px 8px', borderRadius: 'var(--ds-radius-sm)',
                          background: `${LEVEL_COLORS[log.level] || '#71717a'}18`,
                          color: LEVEL_COLORS[log.level] || '#71717a',
                          fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
                        }}>
                          {log.level}
                        </span>
                      </td>
                      <td style={{ padding: '6px 12px', color: '#c084fc', fontFamily: 'var(--ds-font-mono)', fontSize: 12 }}>
                        {log.context || '—'}
                      </td>
                      <td style={{ padding: '6px 12px', color: 'var(--ds-text-primary)', fontFamily: 'var(--ds-font-mono)', wordBreak: 'break-word', fontSize: 12 }}>
                        {log.message}
                        {log.data && (
                          <span style={{ marginLeft: 8, color: 'var(--ds-text-quaternary)', fontSize: 11 }}>
                            {isExpanded ? '▼' : '▶'} data
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && log.data && (
                      <tr style={{ background: 'var(--ds-bg-inset)' }}>
                        <td colSpan={4} style={{ padding: '8px 12px 8px 104px' }}>
                          <pre style={{
                            margin: 0, padding: 12, borderRadius: 'var(--ds-radius-lg)',
                            background: 'var(--ds-bg-surface)', border: '1px solid var(--ds-border)',
                            color: '#22c55e', fontSize: 12, fontFamily: 'var(--ds-font-mono)',
                            overflow: 'auto', maxHeight: 300,
                          }}>
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LogViewer;
