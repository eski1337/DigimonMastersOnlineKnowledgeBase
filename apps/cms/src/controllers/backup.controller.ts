/**
 * Backup Controller — handles backup listing, download, run, verify, and test restores.
 * Delegates to backup-health service for status. Uses child_process.spawn for script execution.
 * Admin-only. Prevents concurrent script execution via a concurrency lock.
 */
import type { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { collectBackupHealth, resolveBackupPath } from '../services/backup-health.service';
import { collectBackupHealthV2, resolveBackupPathV2 } from '../services/backup-health-v2.service';
import { createLogger } from '../services/logger';

const log = createLogger('backup-ctrl');

// --- Concurrency lock ---
let runningScript: string | null = null;

const SCRIPTS_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'scripts', 'backup');
const SCRIPTS_V2_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'scripts', 'backup-v2');

const BACKUP_ENV = {
  BACKUP_ROOT: process.env.BACKUP_ROOT || process.env.BACKUP_DIR || '/home/deploy/backups',
  BACKUP_DIR: process.env.BACKUP_DIR || '/home/deploy/backups',
  MEDIA_DIR: process.env.MEDIA_DIR || '/home/deploy/app/apps/cms/media',
  PROJECT_ROOT: process.env.PROJECT_ROOT || '/home/deploy/app',
};

/* ── Shared script runner with streaming output ──────────────────────── */

function runScriptStreaming(
  res: Response,
  scriptPath: string,
  scriptName: string,
  extraEnv: Record<string, string> = {},
  timeoutMs = 600000,
  scriptArgs: string[] = [],
): void {
  if (runningScript) {
    res.status(409).json({ error: `Script already running: ${runningScript}` });
    return;
  }

  if (!fs.existsSync(scriptPath)) {
    res.status(500).json({ error: `Script not found: ${scriptName}` });
    return;
  }

  runningScript = scriptName;
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });

  const proc = spawn('bash', [scriptPath, ...scriptArgs], {
    env: { ...process.env, ...BACKUP_ENV, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const sanitize = (chunk: Buffer) =>
    chunk.toString('utf-8').replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');

  proc.stdout?.on('data', (chunk) => { try { res.write(sanitize(chunk)); } catch {} });
  proc.stderr?.on('data', (chunk) => { try { res.write(sanitize(chunk)); } catch {} });

  proc.on('close', (code) => {
    runningScript = null;
    try { res.write(`\n--- Script exited with code ${code} ---\n`); res.end(); } catch {}
    log.info({ script: scriptName, code }, 'Script completed');
  });

  proc.on('error', (err) => {
    runningScript = null;
    log.error({ error: err.message, script: scriptName }, 'Script error');
    try { res.write(`\nERROR: ${err.message}\n`); res.end(); } catch {}
  });

  setTimeout(() => {
    if (runningScript === scriptName) {
      proc.kill('SIGTERM');
      runningScript = null;
      try { res.write(`\n--- Timeout: script killed after ${Math.round(timeoutMs / 60000)} minutes ---\n`); res.end(); } catch {}
    }
  }, timeoutMs);
}

function resolveV2Script(name: string, v1Fallback?: string): string | null {
  const v2 = path.join(SCRIPTS_V2_DIR, name);
  if (fs.existsSync(v2)) return v2;
  if (v1Fallback) {
    const v1 = path.join(SCRIPTS_DIR, v1Fallback);
    if (fs.existsSync(v1)) return v1;
  }
  return null;
}

/* ── GET /api/internal/backups ───────────────────────────────────────── */

export async function listBackups(_req: Request, res: Response): Promise<void> {
  try {
    const backupRoot = BACKUP_ENV.BACKUP_ROOT;
    const v2Exists = fs.existsSync(path.join(backupRoot, 'full')) || fs.existsSync(path.join(backupRoot, 'incremental'));
    if (v2Exists) {
      const health = await collectBackupHealthV2();
      res.json(health);
    } else {
      const health = await collectBackupHealth();
      res.json(health);
    }
  } catch (e: any) {
    log.error({ error: e.message }, 'Failed to list backups');
    res.status(500).json({ error: 'Failed to list backups' });
  }
}

/* ── GET /api/internal/backups/status ────────────────────────────────── */

export function getRunningStatus(_req: Request, res: Response): void {
  res.json({ running: runningScript });
}

/* ── GET /api/internal/backups/download/* OR /:type/:filename ─────────── */

export function downloadBackup(req: Request, res: Response): void {
  // Wildcard route: req.params[0] = "full/2026-03-08/mongo_full_...archive.gz"
  // Legacy route: req.params.type + req.params.filename
  const wildcard = req.params[0];
  const { type, filename } = req.params;
  const subpath = wildcard || `${type}/${filename}`;
  let filePath = resolveBackupPathV2(subpath);

  // Fall back to v1 resolver for legacy :type/:filename routes
  if (!filePath && type && filename && (type === 'mongo' || type === 'uploads')) {
    filePath = resolveBackupPath(type as 'mongo' | 'uploads', filename);
  }

  if (!filePath) {
    res.status(404).json({ error: 'Backup not found' });
    return;
  }

  const user = (req as any).user;
  const dlFilename = path.basename(filePath);
  log.info({ user: user?.email, subpath }, 'Backup download initiated');

  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${dlFilename}"`);

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Length', stat.size);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on('error', (err) => {
    log.error({ error: err.message, filename }, 'Download stream error');
    if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
  });
}

/* ── POST /api/internal/backups/run ──────────────────────────────────── */

export function runBackup(req: Request, res: Response): void {
  const user = (req as any).user;
  log.info({ user: user?.email }, 'Manual backup triggered');
  const script = resolveV2Script('backup-full.sh', 'backup-all.sh');
  if (!script) { res.status(500).json({ error: 'Backup script not found' }); return; }
  runScriptStreaming(res, script, 'backup-full.sh', {}, 600000);
}

/* ── POST /api/internal/backups/verify ───────────────────────────────── */

export function runVerify(req: Request, res: Response): void {
  const user = (req as any).user;
  log.info({ user: user?.email }, 'Manual verification triggered');
  const script = resolveV2Script('verify.sh', 'verify-backup.sh');
  if (!script) { res.status(500).json({ error: 'Verify script not found' }); return; }
  runScriptStreaming(res, script, 'verify.sh', {}, 300000);
}

/* ── POST /api/internal/backups/run-collections ──────────────────────── */

export function runCollectionBackup(req: Request, res: Response): void {
  const user = (req as any).user;
  log.info({ user: user?.email }, 'Manual collection backup triggered');
  const script = resolveV2Script('backup-collections.sh');
  if (!script) { res.status(500).json({ error: 'Collection backup script not found' }); return; }
  runScriptStreaming(res, script, 'backup-collections.sh', {}, 300000);
}

/* ── POST /api/internal/backups/run-uploads ──────────────────────────── */

export function runUploadsBackup(req: Request, res: Response): void {
  const user = (req as any).user;
  log.info({ user: user?.email }, 'Manual uploads backup triggered');
  const script = resolveV2Script('backup-uploads.sh');
  if (!script) { res.status(500).json({ error: 'Uploads backup script not found' }); return; }
  runScriptStreaming(res, script, 'backup-uploads.sh', {}, 600000);
}

/* ── POST /api/internal/backups/run-incremental ──────────────────────── */

export function runIncrementalBackup(req: Request, res: Response): void {
  const user = (req as any).user;
  log.info({ user: user?.email }, 'Manual incremental backup triggered');
  const script = resolveV2Script('backup-incremental.sh');
  if (!script) { res.status(500).json({ error: 'Incremental backup script not found' }); return; }
  runScriptStreaming(res, script, 'backup-incremental.sh', {}, 300000);
}

/* ── POST /api/internal/backups/test-full ────────────────────────────── */

export function testFullRestore(req: Request, res: Response): void {
  const user = (req as any).user;
  log.info({ user: user?.email }, 'Test full restore triggered');

  // verify.sh already does a test restore into a temp DB + compares counts
  const script = resolveV2Script('verify.sh');
  if (!script) { res.status(500).json({ error: 'Verify script not found' }); return; }
  runScriptStreaming(res, script, 'test-full-restore', {}, 300000);
}

/* ── POST /api/internal/backups/test-collection ─────────────────────── */

export function testCollectionRestore(req: Request, res: Response): void {
  const user = (req as any).user;
  const collection = req.body?.collection || '';
  log.info({ user: user?.email, collection }, 'Test collection restore triggered');

  // Use restore.sh list to show available backups (non-interactive)
  const script = resolveV2Script('restore.sh');
  if (!script) { res.status(500).json({ error: 'Restore script not found' }); return; }
  runScriptStreaming(res, script, 'test-collection-restore',
    collection ? { RESTORE_COLLECTION: collection } : {},
    120000,
    ['list'],
  );
}

/* ── POST /api/internal/backups/test-uploads ─────────────────────────── */

export function testUploadsRestore(req: Request, res: Response): void {
  const user = (req as any).user;
  log.info({ user: user?.email }, 'Test uploads snapshot triggered');

  // Run backup-uploads.sh to create a fresh snapshot (non-destructive)
  const script = resolveV2Script('backup-uploads.sh');
  if (!script) { res.status(500).json({ error: 'Uploads backup script not found' }); return; }
  runScriptStreaming(res, script, 'test-uploads-snapshot', {}, 300000);
}

/* ── POST /api/internal/backups/run-retention ────────────────────────── */

export function runRetention(req: Request, res: Response): void {
  const user = (req as any).user;
  const dryRun = req.query.dryRun === 'true' || req.body?.dryRun === true;
  log.info({ user: user?.email, dryRun }, 'Manual retention triggered');

  const script = resolveV2Script('retention.sh');
  if (!script) { res.status(500).json({ error: 'Retention script not found' }); return; }

  const args = dryRun ? ['bash', script, '--dry-run'] : ['bash', script];

  if (runningScript) {
    res.status(409).json({ error: `Script already running: ${runningScript}` });
    return;
  }

  // Can't use runScriptStreaming directly since we need to pass args
  runningScript = 'retention.sh';
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
  });

  const proc = spawn(args[0], args.slice(1), {
    env: { ...process.env, ...BACKUP_ENV },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const sanitize = (chunk: Buffer) =>
    chunk.toString('utf-8').replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');

  proc.stdout?.on('data', (chunk) => { try { res.write(sanitize(chunk)); } catch {} });
  proc.stderr?.on('data', (chunk) => { try { res.write(sanitize(chunk)); } catch {} });

  proc.on('close', (code) => {
    runningScript = null;
    try { res.write(`\n--- Script exited with code ${code} ---\n`); res.end(); } catch {}
  });

  proc.on('error', (err) => {
    runningScript = null;
    try { res.write(`\nERROR: ${err.message}\n`); res.end(); } catch {}
  });

  setTimeout(() => {
    if (runningScript === 'retention.sh') {
      proc.kill('SIGTERM');
      runningScript = null;
      try { res.write('\n--- Timeout ---\n'); res.end(); } catch {}
    }
  }, 120000);
}
