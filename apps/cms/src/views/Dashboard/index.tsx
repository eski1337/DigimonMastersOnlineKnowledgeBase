import React, { useEffect, useState, useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface CollectionStat {
  label: string;
  slug: string;
  count: number | null;
  icon: React.ReactNode;
  color: string;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  updatedAt: string;
}

interface SystemHealth {
  cpu: number;
  memPct: number;
  uptime: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
}

// ── Icons (inline SVG for zero-dependency premium feel) ──────────────────────

const icons = {
  digimon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  item: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  guide: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  quest: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  map: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  tasks: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  board: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  health: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  backup: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  chevron: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

// ── Config ───────────────────────────────────────────────────────────────────

const STAT_CONFIGS: { label: string; slug: string; icon: React.ReactNode; color: string }[] = [
  { label: 'Digimon', slug: 'digimon', icon: icons.digimon, color: '#f97316' },
  { label: 'Evolution Lines', slug: 'evolution-lines', icon: icons.link, color: '#8b5cf6' },
  { label: 'Items', slug: 'items', icon: icons.item, color: '#06b6d4' },
  { label: 'Guides', slug: 'guides', icon: icons.guide, color: '#22c55e' },
  { label: 'Quests', slug: 'quests', icon: icons.quest, color: '#eab308' },
  { label: 'Maps', slug: 'maps', icon: icons.map, color: '#ec4899' },
  { label: 'Users', slug: 'users', icon: icons.users, color: '#6366f1' },
  { label: 'Tasks', slug: 'tasks', icon: icons.tasks, color: '#14b8a6' },
];

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const STATUS_COLORS: Record<string, string> = {
  backlog: '#52525b',
  todo: '#3b82f6',
  in_progress: '#f97316',
  review: '#8b5cf6',
  done: '#22c55e',
};

const PRIORITY_DOTS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const QUICK_ACTIONS = [
  { label: 'Add Digimon', href: '/admin/collections/digimon/create', icon: icons.plus, color: '#f97316' },
  { label: 'Write Guide', href: '/admin/collections/guides/create', icon: icons.edit, color: '#22c55e' },
  { label: 'Add Quest', href: '/admin/collections/quests/create', icon: icons.plus, color: '#eab308' },
  { label: 'Add Item', href: '/admin/collections/items/create', icon: icons.plus, color: '#06b6d4' },
  { label: 'Task Board', href: '/admin/kanban', icon: icons.board, color: '#8b5cf6' },
  { label: 'Server Health', href: '/admin/server-health', icon: icons.health, color: '#14b8a6' },
  { label: 'Backups', href: '/admin/backups', icon: icons.backup, color: '#6366f1' },
  { label: 'Manage Users', href: '/admin/collections/users', icon: icons.users, color: '#a1a1aa' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// ── Skeleton Components ──────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--ds-bg-surface)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-radius-xl)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div className="ds-skeleton" style={{ width: 36, height: 36, borderRadius: 'var(--ds-radius-lg)' }} />
      <div style={{ flex: 1 }}>
        <div className="ds-skeleton" style={{ width: '40%', height: 20, marginBottom: 4 }} />
        <div className="ds-skeleton" style={{ width: '60%', height: 12 }} />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
      <div className="ds-skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
      <div className="ds-skeleton" style={{ flex: 1, height: 13 }} />
      <div className="ds-skeleton" style={{ width: 60, height: 18, borderRadius: 4 }} />
    </div>
  );
}

// ── System Health Bar ────────────────────────────────────────────────────────

function HealthBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = pct > 90 ? '#ef4444' : pct > 75 ? '#eab308' : color;
  return (
    <div className="sys-health-row" style={{ flexWrap: 'wrap' }}>
      <span className="sys-health-label">{label}</span>
      <span className="sys-health-value" style={{ color: barColor }}>{value.toFixed(1)}%</span>
      <div className="sys-health-bar" style={{ width: '100%' }}>
        <div className="sys-health-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

// ── Status Dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'operational' | 'degraded' | 'down' | 'unknown' }) {
  const colors: Record<string, string> = { operational: '#22c55e', degraded: '#eab308', down: '#ef4444', unknown: '#71717a' };
  const labels: Record<string, string> = { operational: 'All systems operational', degraded: 'Degraded performance', down: 'System down', unknown: 'Checking...' };
  const c = colors[status] || colors.unknown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: c, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block', boxShadow: `0 0 6px ${c}55` }} />
      {labels[status] || labels.unknown}
    </span>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<CollectionStat[]>(STAT_CONFIGS.map((c) => ({ ...c, count: null })));
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [taskStats, setTaskStats] = useState<Record<string, number>>({});
  const [sysHealth, setSysHealth] = useState<SystemHealth>({ cpu: 0, memPct: 0, uptime: '—', status: 'unknown' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Collection counts
        const countResults = await Promise.all(
          STAT_CONFIGS.map(async (config) => {
            try {
              const res = await fetch(`/api/${config.slug}?limit=0&depth=0`);
              if (res.ok) {
                const data = await res.json();
                return { ...config, count: data.totalDocs ?? 0 };
              }
            } catch {}
            return { ...config, count: 0 };
          })
        );
        setStats(countResults);

        // Tasks
        try {
          const [recentRes, allTasksRes] = await Promise.all([
            fetch('/api/tasks?limit=8&sort=-updatedAt&depth=0'),
            fetch('/api/tasks?limit=0&depth=0'),
          ]);

          if (recentRes.ok) {
            const d = await recentRes.json();
            setRecentTasks((d.docs || []).map((t: any) => ({
              id: t.id, title: t.title, status: t.status, priority: t.priority, updatedAt: t.updatedAt,
            })));
          }

          if (allTasksRes.ok) {
            const d = await allTasksRes.json();
            const counts: Record<string, number> = {};
            (d.docs || []).forEach((t: any) => { counts[t.status] = (counts[t.status] || 0) + 1; });
            setTaskStats(counts);
          }
        } catch {}

        // System health (graceful — may not be available)
        try {
          const res = await fetch('/api/internal/metrics');
          if (res.ok) {
            const d = await res.json();
            const m = d.metrics;
            if (m) {
              setSysHealth({
                cpu: m.system?.cpuPercent || 0,
                memPct: m.system?.memUsedPct || 0,
                uptime: m.system?.uptimeSeconds ? formatUptime(m.system.uptimeSeconds) : '—',
                status: 'operational',
              });
            }
          }
        } catch {
          setSysHealth((s) => ({ ...s, status: 'unknown' }));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const totalTasks = useMemo(() => Object.values(taskStats).reduce((a, b) => a + b, 0), [taskStats]);
  const totalContent = useMemo(() => stats.filter((s) => !['users', 'tasks'].includes(s.slug)).reduce((a, s) => a + (s.count || 0), 0), [stats]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="dashboard-root ds-fade-in">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1>DMO Knowledge Base</h1>
            <p className="dashboard-subtitle">{greeting} — {dateStr}</p>
          </div>
          <StatusDot status={sysHealth.status} />
        </div>
      </div>

      {/* ── Summary Row ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <SummaryCard label="Total Content" value={loading ? '...' : totalContent.toLocaleString()} sub={`${stats.filter((s) => !['users', 'tasks'].includes(s.slug)).length} collections`} color="#f97316" />
        <SummaryCard label="Active Tasks" value={loading ? '...' : String((taskStats.todo || 0) + (taskStats.in_progress || 0) + (taskStats.review || 0))} sub={`${totalTasks} total`} color="#8b5cf6" />
        <SummaryCard label="Uptime" value={sysHealth.uptime} sub={`CPU ${sysHealth.cpu.toFixed(0)}% · Mem ${sysHealth.memPct.toFixed(0)}%`} color="#22c55e" />
      </div>

      {/* ── Content Stats Grid ────────────────────────────────── */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="dashboard-section-title">Collections</h2>
          <span style={{ fontSize: 11, color: 'var(--ds-text-quaternary)' }}>{totalContent.toLocaleString()} documents</span>
        </div>
        <div className="stats-grid">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : stats.map((stat) => (
                <a key={stat.slug} href={`/admin/collections/${stat.slug}`} className="stat-card" style={{ '--accent': stat.color } as React.CSSProperties}>
                  <div className="stat-icon" style={{ color: stat.color }}>{stat.icon}</div>
                  <div className="stat-info">
                    <span className="stat-count">{stat.count === null ? '...' : stat.count.toLocaleString()}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                </a>
              ))
          }
        </div>
      </div>

      {/* ── Task Pipeline ─────────────────────────────────────── */}
      {totalTasks > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="dashboard-section-title">Task Pipeline</h2>
            <a href="/admin/kanban" className="section-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Open Board {icons.chevron}
            </a>
          </div>
          <div className="pipeline-container">
            <div className="pipeline-bar">
              {Object.entries(STATUS_LABELS).map(([key]) => {
                const count = taskStats[key] || 0;
                const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                if (pct === 0) return null;
                return <div key={key} className="pipeline-segment" style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[key] }} title={`${STATUS_LABELS[key]}: ${count}`} />;
              })}
            </div>
            <div className="pipeline-legend">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const count = taskStats[key] || 0;
                if (count === 0) return null;
                return (
                  <div key={key} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: STATUS_COLORS[key] }} />
                    <span className="legend-text">{label} <strong style={{ color: 'var(--ds-text-secondary)', fontWeight: 600 }}>{count}</strong></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Two Column: Recent Tasks + Right Sidebar ──────────── */}
      <div className="dashboard-columns">
        {/* Left: Recent Tasks */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="dashboard-section-title">Recent Activity</h2>
            <a href="/admin/collections/tasks" className="section-link">View all</a>
          </div>
          {loading ? (
            <div className="tasks-list">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : recentTasks.length === 0 ? (
            <div style={{ background: 'var(--ds-bg-surface)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-radius-xl)', padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>📋</div>
              <div style={{ color: 'var(--ds-text-tertiary)', fontSize: 13 }}>No tasks yet. Create your first task to get started.</div>
              <a href="/admin/collections/tasks/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '6px 14px', borderRadius: 'var(--ds-radius-lg)', background: 'var(--ds-accent)', color: 'var(--ds-accent-fg)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                {icons.plus} Create Task
              </a>
            </div>
          ) : (
            <div className="tasks-list">
              {recentTasks.map((task) => (
                <a key={task.id} href={`/admin/collections/tasks/${task.id}`} className="task-row">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_DOTS[task.priority] || '#71717a', flexShrink: 0 }} />
                  <span className="task-title">{task.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--ds-text-quaternary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(task.updatedAt)}</span>
                  <span className="task-status-badge" style={{ backgroundColor: (STATUS_COLORS[task.status] || '#52525b') + '18', color: STATUS_COLORS[task.status] || '#a1a1aa', borderColor: (STATUS_COLORS[task.status] || '#52525b') + '30' }}>
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions + System Health */}
        <div>
          {/* Quick Actions */}
          <div className="dashboard-section">
            <h2 className="dashboard-section-title">Quick Actions</h2>
            <div className="quick-links">
              {QUICK_ACTIONS.map((action) => (
                <a key={action.href} href={action.href} className="quick-link">
                  <span className="ql-icon" style={{ color: action.color }}>{action.icon}</span>
                  <span>{action.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* System Health Mini */}
          {sysHealth.status !== 'unknown' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2 className="dashboard-section-title">System</h2>
                <a href="/admin/server-health" className="section-link">Details</a>
              </div>
              <div className="sys-health-widget">
                <HealthBar value={sysHealth.cpu} max={100} color="#3b82f6" label="CPU" />
                <HealthBar value={sysHealth.memPct} max={100} color="#8b5cf6" label="Memory" />
                <div className="sys-health-row" style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--ds-border-subtle)' }}>
                  <span className="sys-health-label">Uptime</span>
                  <span className="sys-health-value">{sysHealth.uptime}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      background: 'var(--ds-bg-surface)',
      border: '1px solid var(--ds-border)',
      borderRadius: 'var(--ds-radius-xl)',
      padding: '20px 20px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, opacity: 0.5 }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-quaternary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ds-text-primary)', letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{sub}</div>
    </div>
  );
}

export default Dashboard;
