import { Endpoint } from 'payload/config';
import { getLogs, getLogContexts, clearLogs } from '../services/log-store';

/**
 * GET /api/app-logs — Fetch logs from in-memory ring buffer (owner-only)
 * Query params: level, context, search, limit, after
 */
const getLogsEndpoint: Endpoint = {
  path: '/app-logs',
  method: 'get',
  handler: async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden — owner only' });
    }

    const { level, context, search, limit, after } = req.query as Record<string, string>;

    const result = getLogs({
      level: level || undefined,
      context: context || undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit, 10) : 200,
      after: after ? parseInt(after, 10) : undefined,
    });

    const contexts = getLogContexts();

    return res.json({ ...result, contexts });
  },
};

/**
 * DELETE /api/app-logs — Clear all logs (owner-only)
 */
const clearLogsEndpoint: Endpoint = {
  path: '/app-logs',
  method: 'delete',
  handler: async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden — owner only' });
    }

    clearLogs();
    return res.json({ message: 'Logs cleared' });
  },
};

export { getLogsEndpoint, clearLogsEndpoint };
