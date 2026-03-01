'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Clock,
  User,
  FileText,
  Trash2,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Shield,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────── */

interface DiffEntry {
  field: string;
  before: unknown;
  after: unknown;
}

interface AuditLogEntry {
  id: string;
  user?: { id: string; email: string; name?: string; username?: string } | string;
  userEmail: string;
  userName: string;
  action: string;
  collection?: string;
  targetCollection: string;
  documentId?: string;
  documentTitle?: string;
  diff?: string;
  timestamp: string;
  metadata?: string;
}

interface AuditResponse {
  docs: AuditLogEntry[];
  totalDocs: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/* ── Action Config ─────────────────────────────────────────────── */

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof Plus }> = {
  create:        { label: 'Created',        color: 'bg-green-500/20 text-green-400 border-green-500/50',  icon: Plus },
  update:        { label: 'Updated',        color: 'bg-blue-500/20 text-blue-400 border-blue-500/50',    icon: Edit },
  delete:        { label: 'Deleted',        color: 'bg-red-500/20 text-red-400 border-red-500/50',       icon: Trash2 },
  publish:       { label: 'Published',      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', icon: Eye },
  unpublish:     { label: 'Unpublished',    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',    icon: EyeOff },
  status_change: { label: 'Status Changed', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50',    icon: ArrowUpDown },
  role_change:   { label: 'Role Changed',   color: 'bg-orange-500/20 text-orange-400 border-orange-500/50',    icon: Shield },
  login:         { label: 'Logged In',      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',    icon: User },
  logout:        { label: 'Logged Out',     color: 'bg-slate-500/20 text-slate-400 border-slate-500/50', icon: User },
  bulk_operation:{ label: 'Bulk Op',        color: 'bg-pink-500/20 text-pink-400 border-pink-500/50',    icon: FileText },
};

const COLLECTION_LABELS: Record<string, string> = {
  users: 'Users',
  digimon: 'Digimon',
  'evolution-lines': 'Evolution Lines',
  items: 'Items',
  maps: 'Maps',
  quests: 'Quests',
  guides: 'Guides',
  tools: 'Tools',
  'patch-notes': 'Patch Notes',
  events: 'Events',
  media: 'Media',
  tasks: 'Tasks',
  'task-comments': 'Task Comments',
};

/* ── Helpers ────────────────────────────────────────────────────── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatExact(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function truncateValue(val: unknown, max = 80): string {
  if (val === null || val === undefined) return '(empty)';
  const str = String(val);
  if (str.length <= max) return str;
  return str.substring(0, max) + '…';
}

/* ── Diff Viewer Component ──────────────────────────────────────── */

function DiffViewer({ diffJson }: { diffJson: string }) {
  let entries: DiffEntry[];
  try {
    entries = JSON.parse(diffJson);
  } catch {
    return <p className="text-xs text-muted-foreground italic">Invalid diff data</p>;
  }

  if (!entries || entries.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="rounded-md bg-[#1d2021] border border-border/50 p-3 text-xs font-mono">
          <div className="text-muted-foreground mb-1.5 font-sans font-medium text-[11px] uppercase tracking-wider">
            {entry.field}
          </div>
          <div className="flex flex-col gap-1">
            {entry.before !== null && entry.before !== undefined && (
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold shrink-0">−</span>
                <span className="text-red-300/80 break-all">{truncateValue(entry.before, 200)}</span>
              </div>
            )}
            {entry.after !== null && entry.after !== undefined && (
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold shrink-0">+</span>
                <span className="text-green-300/80 break-all">{truncateValue(entry.after, 200)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Single Audit Entry Component ───────────────────────────────── */

function AuditEntry({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.update;
  const Icon = config.icon;
  const tc = entry.targetCollection || entry.collection || '';
  const collectionLabel = COLLECTION_LABELS[tc] || tc;

  const hasDiff = entry.diff && entry.diff !== '[]' && entry.diff !== 'null';

  return (
    <div className="group flex gap-3 py-3 px-4 hover:bg-[#282828]/50 rounded-lg transition-colors">
      {/* Icon */}
      <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">
            {entry.userName || entry.userEmail || 'System'}
          </span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
            {config.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {entry.documentTitle ? (
              <>
                <span className="text-muted-foreground/70">{collectionLabel} → </span>
                <span className="text-foreground/80 font-medium">{entry.documentTitle}</span>
              </>
            ) : (
              <span className="text-muted-foreground/70">{collectionLabel}</span>
            )}
          </span>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="w-3 h-3 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground/70" title={formatExact(entry.timestamp)}>
            {relativeTime(entry.timestamp)}
          </span>
          <span className="text-xs text-muted-foreground/40 hidden sm:inline">
            {formatExact(entry.timestamp)}
          </span>
        </div>

        {/* Expandable Diff */}
        {hasDiff && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide changes' : 'Show changes'}
            </button>
            {expanded && <DiffViewer diffJson={entry.diff!} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Page Component ────────────────────────────────────────── */

export default function AuditLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);
      if (collectionFilter) params.append('collection', collectionFilter);
      if (userFilter) params.append('user', userFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data: AuditResponse = await res.json();
      setLogs(data.docs || []);
      setTotalPages(data.totalPages || 1);
      setTotalDocs(data.totalDocs || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, actionFilter, collectionFilter, userFilter, router]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || (session.user as any).role !== 'owner') {
      router.push('/');
      return;
    }
    fetchLogs();
  }, [status, session, fetchLogs, router]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [search, actionFilter, collectionFilter, userFilter]);

  if (status === 'loading') {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full mb-2" />
        ))}
      </div>
    );
  }

  if (!session?.user || (session.user as any).role !== 'owner') {
    return null;
  }

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setCollectionFilter('');
    setUserFilter('');
  };

  const hasActiveFilters = search || actionFilter || collectionFilter || userFilter;

  return (
    <div className="container py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <Badge variant="outline" className="text-xs">Owner Only</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Immutable record of all CMS operations — {totalDocs.toLocaleString()} entries
        </p>
      </div>

      {/* Search + Filter Bar */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by document title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="w-full bg-card border border-border rounded-md text-sm py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Collection</label>
              <select
                value={collectionFilter}
                onChange={e => setCollectionFilter(e.target.value)}
                className="w-full bg-card border border-border rounded-md text-sm py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Collections</option>
                {Object.entries(COLLECTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">User</label>
              <input
                type="text"
                placeholder="Filter by email..."
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
                className="w-full bg-card border border-border rounded-md text-sm py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </Card>
        )}
      </div>

      {/* Feed */}
      <Card className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length > 0 ? (
          logs.map(entry => <AuditEntry key={entry.id} entry={entry} />)
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No audit entries found</p>
            <p className="text-sm mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Operations will appear here as they happen'}
            </p>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
