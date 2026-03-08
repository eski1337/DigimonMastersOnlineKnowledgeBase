/**
 * Backup Health Service v2 — inspects the v2 backup directory structure.
 * Supports full/incremental/collection/uploads backup types.
 * Reads manifest.json files for rich metadata.
 */
import fs from 'fs';
import path from 'path';
import { createLogger } from './logger';

const log = createLogger('backup-health-v2');

const BACKUP_ROOT = process.env.BACKUP_ROOT || process.env.BACKUP_DIR || '/home/deploy/backups';
const LOG_FILE = path.join(BACKUP_ROOT, 'logs', 'backup.log');

/* ── Types ────────────────────────────────────────────────────────────── */

export interface BackupFileInfo {
  filename: string;
  path: string;
  sizeMB: number;
  sizeBytes: number;
  timestamp: string | null;
  ageHours: number;
  type: 'full' | 'incremental' | 'collection' | 'uploads';
}

export interface FullBackupInfo {
  date: string;
  mongoFile: string | null;
  mongoSizeMB: number;
  uploadsFile: string | null;
  uploadsSizeMB: number;
  collections: Record<string, number>;
  failures: number;
  timestamp: string | null;
}

export interface CollectionBackupInfo {
  collection: string;
  latestFile: string | null;
  latestTimestamp: string | null;
  latestSizeMB: number;
  documentCount: number;
  totalBackups: number;
}

export interface IncrementalInfo {
  timestamp: string;
  since: string;
  mongoChangedDocs: number;
  mongoChangedCollections: number;
  uploadsChangedFiles: number;
}

export interface UploadsSnapshotInfo {
  timestamp: string;
  snapshotFiles: number;
  newOrChangedFiles: number;
  diskUsageMB: number;
}

export interface BackupHealthV2 {
  version: 2;
  backupRoot: string;
  backupRootExists: boolean;

  // Full backups
  fullBackups: FullBackupInfo[];
  lastFullBackup: FullBackupInfo | null;
  lastFullAge: string | null;

  // Incremental backups
  incrementalCount: number;
  lastIncremental: IncrementalInfo | null;
  lastIncrementalAge: string | null;
  recentIncrementals: IncrementalInfo[];

  // Collection backups
  collectionBackups: CollectionBackupInfo[];

  // Upload snapshots
  uploadsSnapshots: UploadsSnapshotInfo[];
  lastUploadsSnapshot: UploadsSnapshotInfo | null;

  // Status
  lastBackupStatus: 'success' | 'failure' | 'unknown';
  lastVerificationStatus: 'passed' | 'failed' | 'never_run';
  nextScheduledRun: string | null;
  cronInstalled: boolean;

  // Disk
  diskUsage: Record<string, string>;
  totalDiskUsage: string;

  // Warnings
  warnings: string[];

  // Downloadable files
  downloadableFiles: BackupFileInfo[];
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

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

function readJsonSafe(filePath: string): any {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
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

function extractTimestamp(name: string): Date | null {
  const m = name.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2].replace('-', ':')}:00`);
  return isNaN(d.getTime()) ? null : d;
}

function mbFromBytes(bytes: number): number {
  return Math.round(bytes / 1048576 * 100) / 100;
}

function getNextCronRun(): string | null {
  const now = new Date();
  // Next even hour (incremental runs every 2h)
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + (2 - (next.getHours() % 2)));
  if (next <= now) next.setHours(next.getHours() + 2);
  return next.toISOString();
}

/* ── Collectors ───────────────────────────────────────────────────────── */

function collectFullBackups(): FullBackupInfo[] {
  const fullDir = path.join(BACKUP_ROOT, 'full');
  const dirs = readDirSafe(fullDir)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  return dirs.map((dirName) => {
    const manifest = readJsonSafe(path.join(fullDir, dirName, 'manifest.json'));
    if (manifest) {
      return {
        date: dirName,
        mongoFile: manifest.mongoFile || null,
        mongoSizeMB: mbFromBytes(Number(manifest.mongoSizeBytes) || 0),
        uploadsFile: manifest.uploadsFile || null,
        uploadsSizeMB: mbFromBytes(Number(manifest.uploadsSizeBytes) || 0),
        collections: manifest.collections || {},
        failures: Number(manifest.failures) || 0,
        timestamp: manifest.timestamp || null,
      };
    }
    // No manifest — scan for files
    const mongoFiles = readDirSafe(path.join(fullDir, dirName)).filter((f) => f.startsWith('mongo_full_'));
    const uploadsFiles = readDirSafe(path.join(fullDir, dirName)).filter((f) => f.startsWith('uploads_full_'));
    const mongoStat = mongoFiles[0] ? statSafe(path.join(fullDir, dirName, mongoFiles[0])) : null;
    return {
      date: dirName,
      mongoFile: mongoFiles[0] || null,
      mongoSizeMB: mongoStat ? mbFromBytes(mongoStat.size) : 0,
      uploadsFile: uploadsFiles[0] || null,
      uploadsSizeMB: 0,
      collections: {},
      failures: -1,
      timestamp: null,
    };
  });
}

function collectIncrementals(): IncrementalInfo[] {
  const incrDir = path.join(BACKUP_ROOT, 'incremental');
  const dirs = readDirSafe(incrDir)
    .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d))
    .sort()
    .reverse();

  return dirs.slice(0, 50).map((dirName) => {
    const manifest = readJsonSafe(path.join(incrDir, dirName, 'manifest.json'));
    return {
      timestamp: manifest?.timestamp || dirName,
      since: manifest?.since || '',
      mongoChangedDocs: Number(manifest?.mongoChangedDocs) || 0,
      mongoChangedCollections: Number(manifest?.mongoChangedCollections) || 0,
      uploadsChangedFiles: Number(manifest?.uploadsChangedFiles) || 0,
    };
  });
}

function collectCollectionBackups(): CollectionBackupInfo[] {
  const collRoot = path.join(BACKUP_ROOT, 'collections');
  const collDirs = readDirSafe(collRoot).filter((d) => {
    const stat = statSafe(path.join(collRoot, d));
    return stat?.isDirectory();
  });

  return collDirs.map((collName) => {
    const collDir = path.join(collRoot, collName);
    const archives = readDirSafe(collDir)
      .filter((f) => f.endsWith('.archive.gz'))
      .sort()
      .reverse();

    const latestArchive = archives[0] || null;
    let latestMeta: any = null;
    if (latestArchive) {
      const metaFile = latestArchive.replace('.archive.gz', '.meta.json');
      latestMeta = readJsonSafe(path.join(collDir, metaFile));
    }

    const latestStat = latestArchive ? statSafe(path.join(collDir, latestArchive)) : null;

    return {
      collection: collName,
      latestFile: latestArchive,
      latestTimestamp: latestMeta?.timestamp || null,
      latestSizeMB: latestStat ? mbFromBytes(latestStat.size) : 0,
      documentCount: Number(latestMeta?.documentCount) || 0,
      totalBackups: archives.length,
    };
  });
}

function collectUploadsSnapshots(): UploadsSnapshotInfo[] {
  const uploadsDir = path.join(BACKUP_ROOT, 'uploads');
  const dirs = readDirSafe(uploadsDir)
    .filter((d) => d !== 'latest' && /^\d{4}-\d{2}-\d{2}/.test(d))
    .sort()
    .reverse();

  return dirs.slice(0, 20).map((dirName) => {
    const manifest = readJsonSafe(path.join(uploadsDir, dirName, 'manifest.json'));
    return {
      timestamp: manifest?.timestamp || dirName,
      snapshotFiles: Number(manifest?.snapshotFiles) || 0,
      newOrChangedFiles: Number(manifest?.newOrChangedFiles) || 0,
      diskUsageMB: mbFromBytes(Number(manifest?.diskUsageBytes) || 0),
    };
  });
}

function collectDownloadableFiles(): BackupFileInfo[] {
  const files: BackupFileInfo[] = [];
  const now = Date.now();

  // Full backups
  const fullDir = path.join(BACKUP_ROOT, 'full');
  for (const dayDir of readDirSafe(fullDir)) {
    const dayPath = path.join(fullDir, dayDir);
    for (const f of readDirSafe(dayPath)) {
      if (!f.endsWith('.archive.gz') && !f.endsWith('.tar.gz')) continue;
      const stat = statSafe(path.join(dayPath, f));
      const ts = extractTimestamp(f);
      files.push({
        filename: f,
        path: `full/${dayDir}/${f}`,
        sizeMB: stat ? mbFromBytes(stat.size) : 0,
        sizeBytes: stat?.size || 0,
        timestamp: ts?.toISOString() || null,
        ageHours: ts ? Math.round((now - ts.getTime()) / 3600000 * 10) / 10 : 0,
        type: 'full',
      });
    }
  }

  // Collection backups (latest per collection)
  const collRoot = path.join(BACKUP_ROOT, 'collections');
  for (const collName of readDirSafe(collRoot)) {
    const collDir = path.join(collRoot, collName);
    const latest = readDirSafe(collDir)
      .filter((f) => f.endsWith('.archive.gz'))
      .sort()
      .reverse()[0];
    if (!latest) continue;
    const stat = statSafe(path.join(collDir, latest));
    const ts = extractTimestamp(latest);
    files.push({
      filename: latest,
      path: `collections/${collName}/${latest}`,
      sizeMB: stat ? mbFromBytes(stat.size) : 0,
      sizeBytes: stat?.size || 0,
      timestamp: ts?.toISOString() || null,
      ageHours: ts ? Math.round((now - ts.getTime()) / 3600000 * 10) / 10 : 0,
      type: 'collection',
    });
  }

  return files.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

function parseLogStatus(logPath: string): { backup: 'success' | 'failure' | 'unknown'; verify: 'passed' | 'failed' | 'never_run' } {
  try {
    if (!fs.existsSync(logPath)) return { backup: 'unknown', verify: 'never_run' };
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean).reverse();

    let backup: 'success' | 'failure' | 'unknown' = 'unknown';
    let verify: 'passed' | 'failed' | 'never_run' = 'never_run';

    for (const line of lines) {
      if (backup === 'unknown') {
        if (line.includes('FULL BACKUP — SUCCESS')) backup = 'success';
        else if (line.includes('FULL BACKUP') && line.includes('FAILURE')) backup = 'failure';
      }
      if (verify === 'never_run') {
        if (line.includes('VERIFICATION — ALL PASSED')) verify = 'passed';
        else if (line.includes('VERIFICATION') && line.includes('FAILURE')) verify = 'failed';
      }
      if (backup !== 'unknown' && verify !== 'never_run') break;
    }

    return { backup, verify };
  } catch {
    return { backup: 'unknown', verify: 'never_run' };
  }
}

function checkCronInstalled(): boolean {
  try {
    const { execSync } = require('child_process');
    const output = execSync('crontab -l 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
    return output.includes('DMOKB-BACKUP-V2');
  } catch {
    return false;
  }
}

function getDiskUsage(): { byDir: Record<string, string>; total: string } {
  const byDir: Record<string, string> = {};
  try {
    const { execSync } = require('child_process');
    for (const sub of ['full', 'incremental', 'collections', 'uploads', 'metadata', 'logs']) {
      const subPath = path.join(BACKUP_ROOT, sub);
      if (fs.existsSync(subPath)) {
        const output = execSync(`du -sh "${subPath}" 2>/dev/null`, { encoding: 'utf-8', timeout: 10000 }).trim();
        byDir[sub] = output.split('\t')[0] || '0';
      }
    }
    const totalOutput = execSync(`du -sh "${BACKUP_ROOT}" 2>/dev/null`, { encoding: 'utf-8', timeout: 10000 }).trim();
    return { byDir, total: totalOutput.split('\t')[0] || '0' };
  } catch {
    return { byDir, total: '?' };
  }
}

/* ── Main collector ───────────────────────────────────────────────────── */

export async function collectBackupHealthV2(): Promise<BackupHealthV2> {
  const warnings: string[] = [];

  const fullBackups = collectFullBackups();
  const lastFull = fullBackups[0] || null;
  let lastFullAge: string | null = null;

  if (lastFull?.timestamp) {
    const ts = extractTimestamp(lastFull.timestamp);
    if (ts) {
      const ageMs = Date.now() - ts.getTime();
      lastFullAge = humanAge(ageMs);
      if (ageMs > 25 * 3600000) warnings.push('Last full backup is older than 24 hours');
    }
  } else if (fullBackups.length === 0) {
    warnings.push('No full backups found');
  }

  const incrementals = collectIncrementals();
  const lastIncr = incrementals[0] || null;
  let lastIncrAge: string | null = null;
  if (lastIncr?.timestamp) {
    const ts = extractTimestamp(lastIncr.timestamp);
    if (ts) {
      const ageMs = Date.now() - ts.getTime();
      lastIncrAge = humanAge(ageMs);
      if (ageMs > 3 * 3600000) warnings.push('Last incremental backup is older than 3 hours');
    }
  }

  const collBackups = collectCollectionBackups();
  const uploadsSnaps = collectUploadsSnapshots();
  const lastUpload = uploadsSnaps[0] || null;

  const logStatus = parseLogStatus(LOG_FILE);
  if (logStatus.backup === 'failure') warnings.push('Last backup run reported failure');
  if (logStatus.verify === 'failed') warnings.push('Last verification failed');

  const cronInstalled = checkCronInstalled();
  if (!cronInstalled) warnings.push('Cron jobs not installed — run install-cron.sh');

  const disk = getDiskUsage();

  return {
    version: 2,
    backupRoot: BACKUP_ROOT,
    backupRootExists: fs.existsSync(BACKUP_ROOT),

    fullBackups,
    lastFullBackup: lastFull,
    lastFullAge,

    incrementalCount: incrementals.length,
    lastIncremental: lastIncr,
    lastIncrementalAge: lastIncrAge,
    recentIncrementals: incrementals.slice(0, 10),

    collectionBackups: collBackups,

    uploadsSnapshots: uploadsSnaps,
    lastUploadsSnapshot: lastUpload,

    lastBackupStatus: logStatus.backup,
    lastVerificationStatus: logStatus.verify,
    nextScheduledRun: getNextCronRun(),
    cronInstalled,

    diskUsage: disk.byDir,
    totalDiskUsage: disk.total,

    warnings,

    downloadableFiles: collectDownloadableFiles(),
  };
}

/**
 * Resolve a downloadable backup file path with strict validation.
 * subpath format: "full/2026-03-08/mongo_full_2026-03-08_03-00.archive.gz"
 *             or: "collections/digimons/digimons_2026-03-08_03-30.archive.gz"
 */
export function resolveBackupPathV2(subpath: string): string | null {
  if (!subpath || subpath.includes('..')) return null;

  const fullPath = path.join(BACKUP_ROOT, subpath);
  const resolved = path.resolve(fullPath);

  // Must be within BACKUP_ROOT
  if (!resolved.startsWith(path.resolve(BACKUP_ROOT))) return null;

  // Must be a file that exists
  if (!fs.existsSync(resolved)) return null;
  const stat = statSafe(resolved);
  if (!stat?.isFile()) return null;

  // Must be a known archive type
  if (!resolved.endsWith('.archive.gz') && !resolved.endsWith('.tar.gz')) return null;

  return resolved;
}
