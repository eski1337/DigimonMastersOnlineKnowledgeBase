# DMOKB Backup & Restore System

Production-grade local backup system for MongoDB + CMS media on VPS.

## Architecture

```
/backups/
├── mongo/                  # MongoDB archives (gzipped)
│   ├── dmokb_2025-03-01_03-00.archive.gz
│   └── ...
└── uploads/                # Media tarballs (gzipped)
    ├── uploads_2025-03-01_03-00.tar.gz
    └── ...
```

All backups stored locally on VPS. Admin download available via CMS.

## Quick Start

### 1. Initial Setup

```bash
chmod +x scripts/backup/*.sh
sudo mkdir -p /backups/mongo /backups/uploads
```

### 2. Install Cron (Automated Daily Backups)

```bash
./scripts/backup/install-cron.sh
```

This installs:
- **Daily backup** at 03:00 (MongoDB + uploads + retention)
- **Weekly verification** at 04:00 Sunday (test restore into temp DB)

## Scripts

| Script | Purpose |
|--------|---------|
| `backup-mongo.sh` | Dump MongoDB with `--archive --gzip` |
| `backup-uploads.sh` | Tar+gzip media dir |
| `backup-all.sh` | Full backup wrapper (runs all steps) |
| `restore-mongo.sh` | Restore MongoDB from archive |
| `restore-uploads.sh` | Restore media from tarball |
| `verify-backup.sh` | Test-restore into temp DB to verify integrity |
| `retention.sh` | Tiered pruning (14 daily / 4 weekly / 6 monthly) |
| `install-cron.sh` | Install automated cron jobs (idempotent) |
| `common.sh` | Shared logging/utility functions |

## Usage

### Manual Backup
```bash
./scripts/backup/backup-all.sh
```

### MongoDB Only
```bash
./scripts/backup/backup-mongo.sh
```

### Restore MongoDB
```bash
./scripts/backup/restore-mongo.sh latest --drop
./scripts/backup/restore-mongo.sh /backups/mongo/dmokb_2025-03-01_03-00.archive.gz --drop
./scripts/backup/restore-mongo.sh   # list available backups
```

### Restore Uploads
```bash
./scripts/backup/restore-uploads.sh latest
./scripts/backup/restore-uploads.sh /backups/uploads/uploads_2025-03-01_03-00.tar.gz
```

### Verify Backup Integrity
```bash
./scripts/backup/verify-backup.sh          # verify latest
./scripts/backup/verify-backup.sh <file>   # verify specific
```

## CMS Admin Interface

Admin users can manage backups at `/admin/backups`:

- View all MongoDB and uploads backups
- See size, timestamp, age, status
- Download any backup file securely
- Trigger manual backup run
- Trigger manual verification
- View retention summary and warnings

## Retention Policy

| Tier | Keep | Rule |
|------|------|------|
| Daily | 14 | All backups within 14 days |
| Weekly | 4 | Sunday backups within 4 weeks |
| Monthly | 6 | 1st-of-month backups within 6 months |

Applied automatically by `backup-all.sh` and manually via `retention.sh`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/dmo-kb` | MongoDB connection string |
| `BACKUP_DIR` | `/backups` | Local backup root |
| `MEDIA_DIR` | `apps/cms/media` | CMS media directory |
| `LOG_FILE` | `/var/log/dmokb-backup.log` | Log file path |

## Disaster Recovery

```bash
# 1. Restore MongoDB
./scripts/backup/restore-mongo.sh latest --drop

# 2. Restore uploads
./scripts/backup/restore-uploads.sh latest

# 3. Re-install cron
./scripts/backup/install-cron.sh
```

## Logging

All scripts log to `/var/log/dmokb-backup.log` with structured timestamps:
```
[2025-03-01 03:00:01] [INFO] Starting MongoDB backup
[2025-03-01 03:00:05] [INFO] Backup complete: dmokb_2025-03-01_03-00.archive.gz (42.5 MB, 4s)
[2025-03-01 03:00:06] [INFO] MongoDB backup SUCCESS
```

Logrotate configured automatically by `install-cron.sh` (weekly rotation, 8 weeks kept).
