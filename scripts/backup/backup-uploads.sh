#!/usr/bin/env bash
# =============================================================================
# backup-uploads.sh — Compress CMS media/uploads to local tarball
# =============================================================================
# Usage: ./scripts/backup/backup-uploads.sh
# Env:   MEDIA_DIR   (default: auto-detect from project root)
#        BACKUP_DIR  (default: /backups/uploads)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# --- Detect project root ---
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# --- Configuration ---
MEDIA_DIR="${MEDIA_DIR:-${PROJECT_ROOT}/apps/cms/media}"
BACKUP_DIR="${BACKUP_DIR:-/backups/uploads}"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M)"
TARBALL="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=14

# --- Validate media directory ---
if [[ ! -d "${MEDIA_DIR}" ]]; then
    log_warn "Media directory not found: ${MEDIA_DIR}"
    log_warn "Skipping uploads backup."
    exit 0
fi

mkdir -p "${BACKUP_DIR}"

# --- Count files ---
FILE_COUNT=$(find "${MEDIA_DIR}" -type f 2>/dev/null | wc -l)
log_info "Starting uploads backup: ${MEDIA_DIR} (${FILE_COUNT} files)"

# --- Create compressed tarball ---
START_TIME=$(date +%s)

tar -czf "${TARBALL}" \
    -C "$(dirname "${MEDIA_DIR}")" \
    "$(basename "${MEDIA_DIR}")" \
    2>>"${LOG_FILE:-/dev/stderr}"

RESULT=$?
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

if [[ ${RESULT} -ne 0 ]]; then
    log_error "tar failed with exit code ${RESULT}"
    rm -f "${TARBALL}"
    exit 1
fi

FILESIZE=$(file_size "${TARBALL}")
log_info "Uploads tarball created: ${TARBALL} ($(human_size ${FILESIZE}), ${ELAPSED}s)"

# --- Local retention ---
DELETED=$(find "${BACKUP_DIR}" -name "uploads_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -print -delete 2>/dev/null | wc -l)
if [[ "${DELETED}" -gt 0 ]]; then
    log_info "Pruned ${DELETED} uploads backup(s) older than ${RETENTION_DAYS} days"
fi

log_info "Uploads backup SUCCESS"
exit 0
