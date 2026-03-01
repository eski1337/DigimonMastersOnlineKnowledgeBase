#!/usr/bin/env bash
# =============================================================================
# restore-uploads.sh — Restore CMS media/uploads from local tarball backup
# =============================================================================
# Usage: ./scripts/backup/restore-uploads.sh <tarball|latest>
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

MEDIA_DIR="${MEDIA_DIR:-${PROJECT_ROOT}/apps/cms/media}"
BACKUP_DIR="${BACKUP_DIR:-/backups/uploads}"
TARBALL="${1:-}"

if [[ -z "${TARBALL}" ]]; then
    echo "Usage: $0 <tarball_file|latest>"
    echo ""
    echo "Available backups:"
    if [[ -d "${BACKUP_DIR}" ]]; then
        ls -lht "${BACKUP_DIR}"/uploads_*.tar.gz 2>/dev/null | head -10 || echo "  (none found)"
    else
        echo "  Backup directory not found: ${BACKUP_DIR}"
    fi
    exit 1
fi

# --- Resolve tarball ---
if [[ "${TARBALL}" == "latest" ]]; then
    TARBALL=$(ls -t "${BACKUP_DIR}"/uploads_*.tar.gz 2>/dev/null | head -1)
    if [[ -z "${TARBALL}" ]]; then
        log_error "No tarball backups found in ${BACKUP_DIR}"
        exit 1
    fi
    log_info "Resolved 'latest' to: ${TARBALL}"
elif [[ ! -f "${TARBALL}" ]] && [[ -f "${BACKUP_DIR}/${TARBALL}" ]]; then
    TARBALL="${BACKUP_DIR}/${TARBALL}"
fi

if [[ ! -f "${TARBALL}" ]]; then
    log_error "Tarball not found: ${TARBALL}"
    exit 1
fi

# --- Confirmation ---
if [[ -t 0 ]]; then
    echo ""
    echo "This will restore uploads/media to: ${MEDIA_DIR}"
    echo "Source: ${TARBALL}"
    echo ""
    read -rp "Continue? (yes/no): " CONFIRM
    if [[ "${CONFIRM}" != "yes" ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
fi

mkdir -p "${MEDIA_DIR}"

FILESIZE=$(file_size "${TARBALL}")
log_info "Extracting: $(basename "${TARBALL}") ($(human_size ${FILESIZE}))"

START_TIME=$(date +%s)

tar -xzf "${TARBALL}" \
    -C "$(dirname "${MEDIA_DIR}")" \
    2>>"${LOG_FILE:-/dev/stderr}"

RESULT=$?
if [[ ${RESULT} -ne 0 ]]; then
    log_error "tar extraction failed with exit code ${RESULT}"
    exit 1
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

FILE_COUNT=$(find "${MEDIA_DIR}" -type f 2>/dev/null | wc -l)
log_info "Uploads restore SUCCESS: ${FILE_COUNT} files restored (${ELAPSED}s)"
exit 0
