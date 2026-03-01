#!/usr/bin/env bash
# =============================================================================
# restore-mongo.sh — Restore MongoDB from a backup archive
# =============================================================================
# Usage: ./scripts/backup/restore-mongo.sh <backup_file> [--drop]
#        ./scripts/backup/restore-mongo.sh latest [--drop]
#
# Options:
#   --drop    Drop existing collections before restoring
#
# Env:   MONGODB_URI (default: mongodb://localhost:27017/dmo-kb)
#        BACKUP_DIR  (default: /backups/mongo)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# --- Configuration ---
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/dmo-kb}"
BACKUP_DIR="${BACKUP_DIR:-/backups/mongo}"
DROP_FLAG=""

# --- Parse arguments ---
BACKUP_ARG="${1:-}"
shift || true

for arg in "$@"; do
    case "${arg}" in
        --drop) DROP_FLAG="--drop" ;;
        *) log_error "Unknown option: ${arg}"; exit 1 ;;
    esac
done

if [[ -z "${BACKUP_ARG}" ]]; then
    echo "Usage: $0 <backup_file|latest> [--drop]"
    echo ""
    echo "Available backups:"
    if [[ -d "${BACKUP_DIR}" ]]; then
        ls -lht "${BACKUP_DIR}"/dmokb_*.archive.gz 2>/dev/null | head -10 || echo "  (none found)"
    else
        echo "  Backup directory not found: ${BACKUP_DIR}"
    fi
    exit 1
fi

# --- Resolve backup file ---
if [[ "${BACKUP_ARG}" == "latest" ]]; then
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/dmokb_*.archive.gz 2>/dev/null | head -1)
    if [[ -z "${BACKUP_FILE}" ]]; then
        log_error "No backups found in ${BACKUP_DIR}"
        exit 1
    fi
    log_info "Resolved 'latest' to: ${BACKUP_FILE}"
elif [[ -f "${BACKUP_ARG}" ]]; then
    BACKUP_FILE="${BACKUP_ARG}"
elif [[ -f "${BACKUP_DIR}/${BACKUP_ARG}" ]]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_ARG}"
else
    log_error "Backup file not found: ${BACKUP_ARG}"
    exit 1
fi

# --- Validate archive ---
FILESIZE=$(file_size "${BACKUP_FILE}")
if [[ "${FILESIZE}" -lt 1024 ]]; then
    log_error "Backup file too small (${FILESIZE} bytes) — likely corrupt: ${BACKUP_FILE}"
    exit 1
fi

log_info "Restore target: ${BACKUP_FILE} ($(human_size ${FILESIZE}))"
log_info "MongoDB URI: ${MONGODB_URI%%@*}@*** (redacted)"
if [[ -n "${DROP_FLAG}" ]]; then
    log_warn "DROP MODE: Existing collections will be dropped before restore"
fi

# --- Confirmation ---
if [[ -t 0 ]]; then
    echo ""
    echo "WARNING: This will restore the database from backup."
    if [[ -n "${DROP_FLAG}" ]]; then
        echo "         Existing data WILL BE DROPPED."
    fi
    echo ""
    read -rp "Continue? (yes/no): " CONFIRM
    if [[ "${CONFIRM}" != "yes" ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
fi

# --- Detect mongorestore location ---
MONGORESTORE=""
if command -v mongorestore &>/dev/null; then
    MONGORESTORE="local"
elif docker exec dmo-kb-mongo mongorestore --version &>/dev/null 2>&1; then
    MONGORESTORE="docker"
else
    log_error "mongorestore not found (neither locally nor in dmo-kb-mongo container)"
    exit 1
fi

# --- Execute restore ---
START_TIME=$(date +%s)

if [[ "${MONGORESTORE}" == "docker" ]]; then
    log_info "Using mongorestore inside Docker container dmo-kb-mongo"
    docker exec -i dmo-kb-mongo mongorestore \
        --uri="${MONGODB_URI}" \
        --archive \
        --gzip \
        ${DROP_FLAG} \
        < "${BACKUP_FILE}" \
        2>>"${LOG_FILE:-/dev/stderr}"
else
    log_info "Using local mongorestore"
    mongorestore \
        --uri="${MONGODB_URI}" \
        --archive="${BACKUP_FILE}" \
        --gzip \
        ${DROP_FLAG} \
        2>>"${LOG_FILE:-/dev/stderr}"
fi

RESULT=$?
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

if [[ ${RESULT} -ne 0 ]]; then
    log_error "mongorestore failed with exit code ${RESULT}"
    exit 1
fi

log_info "MongoDB restore SUCCESS (${ELAPSED}s)"
exit 0
