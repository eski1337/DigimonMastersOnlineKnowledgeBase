#!/usr/bin/env bash
# =============================================================================
# backup-all.sh — Full local backup wrapper: MongoDB + Uploads + Retention
# =============================================================================
# Usage: ./scripts/backup/backup-all.sh
# Runs all backup steps in sequence. Exits non-zero if any step fails.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# --- Load env ---
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
    load_env "${PROJECT_ROOT}/.env"
fi

BACKUP_DIR="${BACKUP_DIR:-/backups}"
export BACKUP_DIR

FULL_START=$(date +%s)
FAILURES=0

log_info "============================================"
log_info "DMOKB Full Backup — Starting"
log_info "============================================"

# --- Step 1: MongoDB backup ---
log_info "[1/3] MongoDB backup..."
export BACKUP_DIR="${BACKUP_DIR}/mongo"
if bash "${SCRIPT_DIR}/backup-mongo.sh"; then
    log_info "[1/3] MongoDB backup — OK"
else
    log_error "[1/3] MongoDB backup — FAILED"
    FAILURES=$((FAILURES + 1))
fi

# --- Step 2: Uploads backup ---
log_info "[2/3] Uploads backup..."
export BACKUP_DIR="${BACKUP_DIR%/mongo}/uploads"
if bash "${SCRIPT_DIR}/backup-uploads.sh"; then
    log_info "[2/3] Uploads backup — OK"
else
    log_error "[2/3] Uploads backup — FAILED"
    FAILURES=$((FAILURES + 1))
fi

# --- Step 3: Retention policy ---
log_info "[3/3] Applying retention policy..."
export BACKUP_ROOT="${BACKUP_DIR%/uploads}"
if bash "${SCRIPT_DIR}/retention.sh"; then
    log_info "[3/3] Retention policy — OK"
else
    log_warn "[3/3] Retention policy — FAILED (non-fatal)"
fi

# --- Summary ---
FULL_END=$(date +%s)
FULL_ELAPSED=$((FULL_END - FULL_START))

log_info "============================================"
if [[ ${FAILURES} -eq 0 ]]; then
    log_info "DMOKB Full Backup — SUCCESS (${FULL_ELAPSED}s)"
else
    log_error "DMOKB Full Backup — COMPLETED WITH ${FAILURES} FAILURE(S) (${FULL_ELAPSED}s)"
fi
log_info "============================================"

exit ${FAILURES}
