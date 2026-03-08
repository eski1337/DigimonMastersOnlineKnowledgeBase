/**
 * Admin Backup Routes — admin-only backup listing, download, run, verify, restore tests.
 * No business logic — wires HTTP → controller.
 */
import { Router } from 'express';
import {
  listBackups, downloadBackup, runBackup, runVerify, getRunningStatus,
  runCollectionBackup, runUploadsBackup, runIncrementalBackup,
  testFullRestore, testCollectionRestore, testUploadsRestore, runRetention,
} from '../controllers/backup.controller';
import { requireAdmin } from '../middleware/require-admin';

export function createAdminBackupRoutes(): Router {
  const router = Router();

  router.get('/api/internal/backups', requireAdmin, (req, res) => listBackups(req, res));
  router.get('/api/internal/backups/status', requireAdmin, (req, res) => getRunningStatus(req, res));
  router.get('/api/internal/backups/download/*', requireAdmin, (req, res) => downloadBackup(req, res));
  router.get('/api/internal/backups/:type/:filename', requireAdmin, (req, res) => downloadBackup(req, res));

  router.post('/api/internal/backups/run', requireAdmin, (req, res) => runBackup(req, res));
  router.post('/api/internal/backups/verify', requireAdmin, (req, res) => runVerify(req, res));
  router.post('/api/internal/backups/run-collections', requireAdmin, (req, res) => runCollectionBackup(req, res));
  router.post('/api/internal/backups/run-uploads', requireAdmin, (req, res) => runUploadsBackup(req, res));
  router.post('/api/internal/backups/run-incremental', requireAdmin, (req, res) => runIncrementalBackup(req, res));
  router.post('/api/internal/backups/run-retention', requireAdmin, (req, res) => runRetention(req, res));

  router.post('/api/internal/backups/test-full', requireAdmin, (req, res) => testFullRestore(req, res));
  router.post('/api/internal/backups/test-collection', requireAdmin, (req, res) => testCollectionRestore(req, res));
  router.post('/api/internal/backups/test-uploads', requireAdmin, (req, res) => testUploadsRestore(req, res));

  return router;
}
