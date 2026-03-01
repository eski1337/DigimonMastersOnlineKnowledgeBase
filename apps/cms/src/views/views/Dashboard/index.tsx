import React, { useEffect, useState } from 'react';

interface CollectionStat {
  label: string;
  slug: string;
  count: number | null;
  icon: string;
  color: string;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  updatedAt: string;
}

const STAT_CONFIGS: Omit<CollectionStat, 'count'>[] = [
  { label: 'Digimon', slug: 'digimon', icon: '🐉', color: '#f97316' },
  { label: 'Evolution Lines', slug: 'evolution-lines', icon: '🔗', color: '#8b5cf6' },
  { label: 'Items', slug: 'items', icon: '🎒', color: '#06b6d4' },
  { label: 'Guides', slug: 'guides', icon: '📖', color: '#22c55e' },
  { label: 'Quests', slug: 'quests', icon: '⚔️', color: '#eab308' },
  { label: 'Maps', slug: 'maps', icon: '🗺️', color: '#ec4899' },
  { label: 'Users', slug: 'users', icon: '👥', color: '#6366f1' },
  { label: 'Tasks', slug: 'tasks', icon: '📋', color: '#14b8a6' },
];

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const STATUS_COLORS: Record<string, string> = {
  backlog: '#64748b',
  todo: '#3b82f6',
  in_progress: '#f97316',
  review: '#8b5cf6',
  done: '#22c55e',
};

const PRIORITY_ICONS: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<CollectionStat[]>(
    STAT_CONFIGS.map((c) => ({ ...c, count: null }))
  );
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [taskStats, setTaskStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const results = await Promise.all(
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
        setStats(results);

        // Fetch recent tasks
        try {
          const tasksRes = await fetch('/api/tasks?limit=8&sort=-updatedAt&depth=0');
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json();
            setRecentTasks(
              (tasksData.docs || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                updatedAt: t.updatedAt,
              }))
            );

            // Count tasks by status
            const allTasksRes = await fetch('/api/tasks?limit=0&depth=0');
            if (allTasksRes.ok) {
              const allData = await allTasksRes.json();
              const counts: Record<string, number> = {};
              (allData.docs || []).forEach((t: any) => {
                counts[t.status] = (counts[t.status] || 0) + 1;
              });
              setTaskStats(counts);
            }
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const totalTasks = Object.values(taskStats).reduce((a, b) => a + b, 0);

  return (
    <div className="dashboard-root">
      <div className="dashboard-header">
        <h1>DMO Knowledge Base</h1>
        <p className="dashboard-subtitle">Content Management Dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-section">
        <h2 className="dashboard-section-title">Overview</h2>
        <div className="stats-grid">
          {stats.map((stat) => (
            <a
              key={stat.slug}
              href={`/admin/collections/${stat.slug}`}
              className="stat-card"
              style={{ '--accent': stat.color } as React.CSSProperties}
            >
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-info">
                <span className="stat-count">
                  {stat.count === null ? '...' : stat.count.toLocaleString()}
                </span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Task Pipeline */}
      {totalTasks > 0 && (
        <div className="dashboard-section">
          <h2 className="dashboard-section-title">Task Pipeline</h2>
          <div className="pipeline-container">
            <div className="pipeline-bar">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const count = taskStats[key] || 0;
                const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={key}
                    className="pipeline-segment"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: STATUS_COLORS[key],
                    }}
                    title={`${label}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="pipeline-legend">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const count = taskStats[key] || 0;
                if (count === 0) return null;
                return (
                  <div key={key} className="legend-item">
                    <span
                      className="legend-dot"
                      style={{ backgroundColor: STATUS_COLORS[key] }}
                    />
                    <span className="legend-text">
                      {label}: {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Tasks + Quick Links */}
      <div className="dashboard-columns">
        {/* Recent Tasks */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="dashboard-section-title">Recent Tasks</h2>
            <a href="/admin/kanban" className="section-link">
              Open Board →
            </a>
          </div>
          {loading ? (
            <p className="loading-text">Loading...</p>
          ) : recentTasks.length === 0 ? (
            <p className="empty-text">No tasks yet</p>
          ) : (
            <div className="tasks-list">
              {recentTasks.map((task) => (
                <a
                  key={task.id}
                  href={`/admin/collections/tasks/${task.id}`}
                  className="task-row"
                >
                  <span className="task-priority">
                    {PRIORITY_ICONS[task.priority] || '⚪'}
                  </span>
                  <span className="task-title">{task.title}</span>
                  <span
                    className="task-status-badge"
                    style={{
                      backgroundColor: STATUS_COLORS[task.status] + '22',
                      color: STATUS_COLORS[task.status],
                      borderColor: STATUS_COLORS[task.status] + '44',
                    }}
                  >
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="dashboard-section">
          <h2 className="dashboard-section-title">Quick Actions</h2>
          <div className="quick-links">
            <a href="/admin/collections/digimon/create" className="quick-link">
              <span className="ql-icon">➕</span>
              <span>Add Digimon</span>
            </a>
            <a href="/admin/collections/guides/create" className="quick-link">
              <span className="ql-icon">📝</span>
              <span>Write Guide</span>
            </a>
            <a href="/admin/collections/quests/create" className="quick-link">
              <span className="ql-icon">⚔️</span>
              <span>Add Quest</span>
            </a>
            <a href="/admin/collections/items/create" className="quick-link">
              <span className="ql-icon">🎒</span>
              <span>Add Item</span>
            </a>
            <a href="/admin/kanban" className="quick-link">
              <span className="ql-icon">📋</span>
              <span>Task Board</span>
            </a>
            <a href="/admin/collections/users" className="quick-link">
              <span className="ql-icon">👥</span>
              <span>Manage Users</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
