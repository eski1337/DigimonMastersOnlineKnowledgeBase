/**
 * Backup Controller — handles backup listing, download, run, and verify.
 * No system calls directly — delegates to backup-health service.
 * Admin-only. Prevents concurrent script execution.
 */
import type { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { collectBackupHealth, resolveBackupPath } from '../services/backup-health.service';
import { createLogger } from '../services/logger';

const log = createLogger('backup-ctrl');

// --- Concurrency lock ---
let runningScript: string | null = null;

const SCRIPTS_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'scripts', 'backup');

export async function listBackups(_req: Request, res: Response): Promise<void> {
  try {
    const health = await collectBackupHealth();
    res.json(health);
  } catch (e: any) {
    log.error({ error: e.message }, 'Failed to list backups');
    res.status(500).json({ error: 'Failed to list backups' });
  }
}

export function downloadBackup(req: Request, res: Response): void {
  const { type, filename } = req.params;

  if (type !== 'mongo' && type !== 'uploads') {
    res.status(400).json({ error: 'Invalid backup type' });
    return;
  }

  const filePath = resolveBackupPath(type as 'mongo' | 'uploads', filename);
  if (!filePath) {
    res.status(404).json({ error: 'Backup not found' });
    return;
  }

  const user = (req as any).user;
  log.info({ user: user?.email, type, filename }, 'Backup download initiated');

  const contentType = type === 'mongo' ? 'application/gzip' : 'application/gzip';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Length', stat.size);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on('error', (err) => {
    log.error({ error: err.message, filename }, 'Download stream error');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed' });
    }
  });
}

export function runBackup(req: Request, res: Response): void {
  if (runningScript) {
    res.status(409).json({ error: `Script already running: ${runningScript}` });
    return;
  }

  const scriptPath = path.join(SCRIPTS_DIR, 'backup-all.sh');
  if (!fs.existsSync(scriptPath)) {
    res.status(500).json({ error: 'Backup script not found on server' });
    return;
  }

  const user = (req as any).user;
  log.info({ user: user?.email }, 'Manual backup triggered');

  runningScript = 'backup-all.sh';
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' });

  const proc = spawn('bash', [scriptPath], {
    env: { ...process.env, BACKUP_DIR: process.env.BACKUP_DIR || '/backups' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const sanitize = (chunk: Buffer) => {
    const text = chunk.toString('utf-8');
    // Strip ANSI codes and control chars, keep newlines
    return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');
  };

  proc.stdout?.on('data', (chunk) => { try { res.write(sanitize(chunk)); } catch {} });
  proc.stderr?.on('data', (chunk) => { try { res.write(sanitize(chunk)); } catch {} });

  proc.on('close', (code) => {
    runningScript = null;
    try { res.write(`\n--- Script exited with code ${code} ---\n`); res.end(); } catch {}
    log.info({ code }, 'Manual backup completed');
  });

  proc.on('error', (err) => {
    runningScript = null;
    log.error({ error: err.message }, 'Backup script error');
    try { res.write(`\nERROR: ${err.message}\n`); res.end(); } catch {}
  });

  // Safety timeout: 10 minutes
  setTimeout(() => {
    if (runningScript === 'backup-all.sh') {
      proc.kill('SIGTERM');
      runningScript = null;
      try { res.write('\n--- Timeout: script killed after 10 minutes ---\n'); res.end(); } catch {}
    }
  }, 600000);
}

export function runVerify(req: Request, res: Response): void {
  if (runningScript) {
    res.status(409).json({ error: `Script already running: ${runningScript}` });
    return;
  }

  const scriptPath = path.join(SCRIPTS_DIR, 'verify-backup.sh');
  if (!fs.existsSync(scriptPath)) {
    res.status(500).json({ error: 'Verify script not found on server' });
    return;
  }

  const user = (req as any).user;
  log.info({ user: user?.email }, 'Manual verification triggered');

  runningScript = 'verify-backup.sh';
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' });

  const proc = spawn('bash', [scriptPath], {
    env: { ...process.env, BACKUP_DIR: process.env.BACKUP_DIR || '/backups' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const sanitize = (chunk: Buffer) => {
    return chunk.toString('utf-8').replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');
  };

  proc.stdout?.on('data', (chunk) => { try { res.write(sanitize(chunk)); } catch {} });
  proc.stderr?.on('data', (chunk) => { try { res.write(sanitize(chunk)); } catch {} });

  proc.on('close', (code) => {
    runningScript = null;
    try { res.write(`\n--- Script exited with code ${code} ---\n`); res.end(); } catch {}
    log.info({ code }, 'Manual verification completed');
  });

  proc.on('error', (err) => {
    runningScript = null;
    log.error({ error: err.message }, 'Verify script error');
    try { res.write(`\nERROR: ${err.message}\n`); res.end(); } catch {}
  });

  setTimeout(() => {
    if (runningScript === 'verify-backup.sh') {
      proc.kill('SIGTERM');
      runningScript = null;
      try { res.write('\n--- Timeout: script killed after 5 minutes ---\n'); res.end(); } catch {}
    }
  }, 300000);
}
