/**
 * In-memory ring buffer for application logs.
 * Stores the last N log entries for viewing in the CMS admin UI.
 */

export interface LogEntry {
  id: number;
  level: string;
  message: string;
  context?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const MAX_ENTRIES = 1000;
let nextId = 1;
const buffer: LogEntry[] = [];

export function pushLog(level: string, message: string, context?: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    id: nextId++,
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    data,
  };

  buffer.push(entry);

  // Trim to max size
  if (buffer.length > MAX_ENTRIES) {
    buffer.splice(0, buffer.length - MAX_ENTRIES);
  }
}

export function getLogs(options?: {
  level?: string;
  context?: string;
  search?: string;
  limit?: number;
  after?: number;
}): { logs: LogEntry[]; total: number } {
  let filtered = [...buffer];

  if (options?.level) {
    filtered = filtered.filter((e) => e.level === options.level);
  }
  if (options?.context) {
    filtered = filtered.filter((e) => e.context === options.context);
  }
  if (options?.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.message.toLowerCase().includes(q) ||
        (e.context && e.context.toLowerCase().includes(q)) ||
        (e.data && JSON.stringify(e.data).toLowerCase().includes(q))
    );
  }
  if (options?.after) {
    filtered = filtered.filter((e) => e.id > options.after!);
  }

  const total = filtered.length;

  // Return newest first, limited
  filtered.reverse();
  if (options?.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }

  return { logs: filtered, total };
}

export function getLogContexts(): string[] {
  const contexts = new Set<string>();
  for (const entry of buffer) {
    if (entry.context) contexts.add(entry.context);
  }
  return Array.from(contexts).sort();
}

export function clearLogs(): void {
  buffer.length = 0;
}
