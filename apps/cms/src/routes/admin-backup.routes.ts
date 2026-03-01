/**
 * Admin Backup Routes — admin-only backup listing, download, run, verify.
 * No business logic — wires HTTP → controller.
 */
import { Router } from 'express';
import { listBackups, downloadBackup, runBackup, runVerify } from '../controllers/backup.controller';
import { requireAdmin } from '../middleware/require-admin';

export function createAdminBackupRoutes(): Router {
  const router = Router();

  router.get('/api/internal/backups', requireAdmin, (req, res) => listBackups(req, res));
  router.get('/api/internal/backups/:type/:filename', requireAdmin, (req, res) => downloadBackup(req, res));
  router.post('/api/internal/backups/run', requireAdmin, (req, res) => runBackup(req, res));
  router.post('/api/internal/backups/verify', requireAdmin, (req, res) => runVerify(req, res));

  return router;
}
