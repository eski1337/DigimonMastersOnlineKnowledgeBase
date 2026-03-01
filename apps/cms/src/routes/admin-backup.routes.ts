/**
 * Admin Backup Routes — admin-only backup listing, download, run, verify.
 * No business logic — wires HTTP → controller.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { listBackups, downloadBackup, runBackup, runVerify } from '../controllers/backup.controller';

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user || !['admin', 'owner'].includes(user.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function createAdminBackupRoutes(): Router {
  const router = Router();

  router.get('/api/internal/backups', requireAdmin, (req, res) => listBackups(req, res));
  router.get('/api/internal/backups/:type/:filename', requireAdmin, (req, res) => downloadBackup(req, res));
  router.post('/api/internal/backups/run', requireAdmin, (req, res) => runBackup(req, res));
  router.post('/api/internal/backups/verify', requireAdmin, (req, res) => runVerify(req, res));

  return router;
}
