/**
 * Backup Health Service — inspects local backup directories and logs.
 * Never exposes raw file paths. All I/O is non-blocking.
 * Local-only — no S3/rclone/remote logic.
 */
import fs from 'fs';
import path from 'path';
import { createLogger } from './logger';

const log = createLogger('backup-health');

const BACKUP_ROOT = process.env.BACKUP_DIR || '/backups';
const MONGO_DIR = path.join(BACKUP_ROOT, 'mongo');
const UPLOADS_DIR = path.join(BACKUP_ROOT, 'uploads');
const LOG_FILE = '/var/log/dmokb-backup.log';

export interface RetentionCounts {
  daily: number;
  weekly: number;
  monthly: number;
  total: number;
}

export interface BackupFileInfo {
  filename: string;
  sizeMB: number;
  sizeBytes: number;
  timestamp: string | null;
  ageHours: number;
  isStale: boolean;
}

export interface BackupHealth {
  lastBackupTime: string | null;
  lastBackupAge: string | null;
  lastBackupSizeMB: number | null;
  lastBackupStatus: 'success' | 'failure' | 'unknown';
  lastVerificationStatus: 'passed' | 'failed' | 'never_run';
  lastVerificationTime: string | null;
  retention: RetentionCounts;
  nextScheduledRun: string | null;
  backupDirExists: boolean;
  uploadsBackupCount: number;
  warnings: string[];
  mongoFiles: BackupFileInfo[];
  uploadsFiles: BackupFileInfo[];
}

function readDirSafe(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function statSafe(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

export function extractTimestamp(filename: string): Date | null {
  const m = filename.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})/);
  if (!m) return null;
  const dateStr = `${m[1]}T${m[2].replace('-', ':')}:00`;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function humanAge(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ${hr % 24}h ago`;
}

function classifyRetention(files: string[]): RetentionCounts {
  const now = new Date();
  let daily = 0, weekly = 0, monthly = 0;

  for (const f of files) {
    const ts = extractTimestamp(f);
    if (!ts) continue;
    const ageDays = (now.getTime() - ts.getTime()) / 86400000;
    if (ageDays <= 14) daily++;
    else if (ageDays <= 28 && ts.getDay() === 0) weekly++;
    else if (ageDays <= 180 && ts.getDate() === 1) monthly++;
  }

  return { daily, weekly, monthly, total: files.length };
}

function buildFileList(dir: string, files: string[]): BackupFileInfo[] {
  const now = Date.now();
  return files.map((filename) => {
    const stat = statSafe(path.join(dir, filename));
    const ts = extractTimestamp(filename);
    const ageMs = ts ? now - ts.getTime() : Infinity;
    return {
      filename,
      sizeMB: stat ? Math.round(stat.size / 1048576 * 100) / 100 : 0,
      sizeBytes: stat ? stat.size : 0,
      timestamp: ts ? ts.toISOString() : null,
      ageHours: Math.round(ageMs / 3600000 * 10) / 10,
      isStale: ageMs > 25 * 3600000,
    };
  });
}

function parseLastLogStatus(logContent: string): { status: 'success' | 'failure' | 'unknown'; time: string | null } {
  const lines = logContent.split('\n').filter(Boolean).reverse();
  for (const line of lines) {
    if (line.includes('MongoDB backup SUCCESS') || line.includes('Full Backup — SUCCESS')) {
      const tm = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
      return { status: 'success', time: tm ? tm[1] : null };
    }
    if (line.includes('FAILED') || line.includes('ERROR')) {
      const tm = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
      return { status: 'failure', time: tm ? tm[1] : null };
    }
  }
  return { status: 'unknown', time: null };
}

function parseVerificationStatus(logContent: string): { status: 'passed' | 'failed' | 'never_run'; time: string | null } {
  const lines = logContent.split('\n').filter(Boolean).reverse();
  for (const line of lines) {
    if (line.includes('BACKUP VERIFICATION PASSED')) {
      const tm = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
      return { status: 'passed', time: tm ? tm[1] : null };
    }
    if (line.includes('VERIFICATION FAILED')) {
      const tm = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
      return { status: 'failed', time: tm ? tm[1] : null };
    }
  }
  return { status: 'never_run', time: null };
}

function getNextCronRun(): string | null {
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

/**
 * Resolve the absolute path for a backup file, with strict validation.
 * Returns null if the filename is invalid or the file doesn't exist.
 */
export function resolveBackupPath(type: 'mongo' | 'uploads', filename: string): string | null {
  // Block path traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }
  // Validate filename pattern
  if (type === 'mongo' && !/^dmokb_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.archive\.gz$/.test(filename)) {
    return null;
  }
  if (type === 'uploads' && !/^uploads_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.tar\.gz$/.test(filename)) {
    return null;
  }
  const dir = type === 'mongo' ? MONGO_DIR : UPLOADS_DIR;
  const fullPath = path.join(dir, filename);
  // Ensure resolved path is within the expected directory
  if (!fullPath.startsWith(dir)) {
    return null;
  }
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return fullPath;
}

export async function collectBackupHealth(): Promise<BackupHealth> {
  const warnings: string[] = [];

  const mongoFileNames = readDirSafe(MONGO_DIR)
    .filter((f) => f.endsWith('.archive.gz'))
    .sort()
    .reverse();

  const backupDirExists = fs.existsSync(MONGO_DIR);

  let lastBackupTime: string | null = null;
  let lastBackupAge: string | null = null;
  let lastBackupSizeMB: number | null = null;

  if (mongoFileNames.length > 0) {
    const latest = mongoFileNames[0];
    const ts = extractTimestamp(latest);
    if (ts) {
      lastBackupTime = ts.toISOString();
      lastBackupAge = humanAge(Date.now() - ts.getTime());
      if (Date.now() - ts.getTime() > 25 * 3600000) {
        warnings.push('Last backup is older than 24 hours');
      }
    }
    const stat = statSafe(path.join(MONGO_DIR, latest));
    if (stat) {
      lastBackupSizeMB = Math.round(stat.size / 1048576 * 100) / 100;
    }
  } else {
    warnings.push('No MongoDB backups found');
  }

  const retention = classifyRetention(mongoFileNames);

  const uploadsFileNames = readDirSafe(UPLOADS_DIR)
    .filter((f) => f.endsWith('.tar.gz'))
    .sort()
    .reverse();

  let logContent = '';
  try {
    if (fs.existsSync(LOG_FILE)) {
      const full = fs.readFileSync(LOG_FILE, 'utf-8');
      const lines = full.split('\n');
      logContent = lines.slice(-200).join('\n');
    }
  } catch {
    // non-fatal
  }

  const backupStatus = parseLastLogStatus(logContent);
  const verificationStatus = parseVerificationStatus(logContent);

  if (backupStatus.status === 'failure') {
    warnings.push('Last backup run reported failure');
  }
  if (verificationStatus.status === 'failed') {
    warnings.push('Last backup verification failed');
  }

  return {
    lastBackupTime,
    lastBackupAge,
    lastBackupSizeMB,
    lastBackupStatus: backupStatus.status,
    lastVerificationStatus: verificationStatus.status,
    lastVerificationTime: verificationStatus.time,
    retention,
    nextScheduledRun: getNextCronRun(),
    backupDirExists,
    uploadsBackupCount: uploadsFileNames.length,
    warnings,
    mongoFiles: buildFileList(MONGO_DIR, mongoFileNames),
    uploadsFiles: buildFileList(UPLOADS_DIR, uploadsFileNames),
  };
}
