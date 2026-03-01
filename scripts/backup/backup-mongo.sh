#!/usr/bin/env bash
# =============================================================================
# backup-mongo.sh — Automated MongoDB backup with compression
# =============================================================================
# Usage: ./scripts/backup/backup-mongo.sh
# Env:   MONGODB_URI (default: mongodb://localhost:27017/dmo-kb)
#        BACKUP_DIR  (default: /backups/mongo)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# --- Configuration ---
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/dmo-kb}"
BACKUP_DIR="${BACKUP_DIR:-/backups/mongo}"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M)"
BACKUP_FILE="${BACKUP_DIR}/dmokb_${TIMESTAMP}.archive.gz"
RETENTION_DAYS=14

# --- Setup ---
mkdir -p "${BACKUP_DIR}"

log_info "Starting MongoDB backup"
log_info "URI: ${MONGODB_URI%%@*}@*** (redacted)"
log_info "Target: ${BACKUP_FILE}"

# --- Detect mongodump location ---
MONGODUMP=""
if command -v mongodump &>/dev/null; then
    MONGODUMP="mongodump"
elif docker exec dmo-kb-mongo mongodump --version &>/dev/null 2>&1; then
    MONGODUMP="docker"
else
    log_error "mongodump not found (neither locally nor in dmo-kb-mongo container)"
    exit 1
fi

# --- Execute backup ---
START_TIME=$(date +%s)

RESULT=0
if [[ "${MONGODUMP}" == "docker" ]]; then
    log_info "Using mongodump inside Docker container dmo-kb-mongo"
    docker exec dmo-kb-mongo mongodump \
        --uri="${MONGODB_URI}" \
        --archive \
        --gzip \
        > "${BACKUP_FILE}" \
        2>>"${LOG_FILE:-/dev/stderr}" \
        || RESULT=$?
else
    log_info "Using local mongodump"
    mongodump \
        --uri="${MONGODB_URI}" \
        --archive="${BACKUP_FILE}" \
        --gzip \
        2>>"${LOG_FILE:-/dev/stderr}" \
        || RESULT=$?
fi
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

if [[ ${RESULT} -ne 0 ]]; then
    log_error "mongodump failed with exit code ${RESULT}"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# --- Verify backup file ---
if [[ ! -f "${BACKUP_FILE}" ]]; then
    log_error "Backup file not created: ${BACKUP_FILE}"
    exit 1
fi

FILESIZE=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || stat -f%z "${BACKUP_FILE}" 2>/dev/null || echo "0")
if [[ "${FILESIZE}" -lt 1024 ]]; then
    log_error "Backup file suspiciously small (${FILESIZE} bytes): ${BACKUP_FILE}"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

FILESIZE_MB=$(echo "scale=2; ${FILESIZE}/1048576" | bc 2>/dev/null || echo "${FILESIZE} bytes")

log_info "Backup complete: ${BACKUP_FILE} (${FILESIZE_MB} MB, ${ELAPSED}s)"

# --- Quick retention: delete files older than RETENTION_DAYS ---
DELETED=$(find "${BACKUP_DIR}" -name "dmokb_*.archive.gz" -type f -mtime +${RETENTION_DAYS} -print -delete 2>/dev/null | wc -l)
if [[ "${DELETED}" -gt 0 ]]; then
    log_info "Pruned ${DELETED} backup(s) older than ${RETENTION_DAYS} days"
fi

log_info "MongoDB backup SUCCESS"
exit 0
