#!/usr/bin/env bash
# =============================================================================
# verify-backup.sh — Verify backup integrity by test-restoring into temp DB
# =============================================================================
# Usage: ./scripts/backup/verify-backup.sh [backup_file]
#        ./scripts/backup/verify-backup.sh          (uses latest)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/dmo-kb}"
BACKUP_DIR="${BACKUP_DIR:-/backups/mongo}"
TEST_DB="dmokb_backup_verify_$$"

# --- Resolve backup file ---
BACKUP_ARG="${1:-latest}"

if [[ "${BACKUP_ARG}" == "latest" ]]; then
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/dmokb_*.archive.gz 2>/dev/null | head -1)
    if [[ -z "${BACKUP_FILE}" ]]; then
        log_error "No backups found in ${BACKUP_DIR}"
        exit 1
    fi
elif [[ -f "${BACKUP_ARG}" ]]; then
    BACKUP_FILE="${BACKUP_ARG}"
elif [[ -f "${BACKUP_DIR}/${BACKUP_ARG}" ]]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_ARG}"
else
    log_error "Backup file not found: ${BACKUP_ARG}"
    exit 1
fi

FILESIZE=$(file_size "${BACKUP_FILE}")
log_info "Verifying backup: $(basename "${BACKUP_FILE}") ($(human_size ${FILESIZE}))"

# --- Build test URI (replace DB name with test DB) ---
# Handles both mongodb:// and mongodb+srv:// URIs
if [[ "${MONGODB_URI}" =~ ^mongodb(\+srv)?://([^/]+)/([^?]+)(.*)?$ ]]; then
    TEST_URI="mongodb${BASH_REMATCH[1]}://${BASH_REMATCH[2]}/${TEST_DB}${BASH_REMATCH[4]}"
else
    # Fallback: append test DB
    BASE_URI="${MONGODB_URI%%/*}"
    TEST_URI="${BASE_URI}/${TEST_DB}"
fi

log_info "Test database: ${TEST_DB}"

# --- Cleanup function ---
cleanup() {
    log_info "Dropping test database: ${TEST_DB}"
    if command -v mongosh &>/dev/null; then
        mongosh "${TEST_URI}" --eval "db.dropDatabase()" --quiet 2>/dev/null || true
    elif docker exec dmo-kb-mongo mongosh --version &>/dev/null 2>&1; then
        docker exec dmo-kb-mongo mongosh "${TEST_URI}" --eval "db.dropDatabase()" --quiet 2>/dev/null || true
    elif command -v mongo &>/dev/null; then
        mongo "${TEST_URI}" --eval "db.dropDatabase()" --quiet 2>/dev/null || true
    elif docker exec dmo-kb-mongo mongo --version &>/dev/null 2>&1; then
        docker exec dmo-kb-mongo mongo "${TEST_URI}" --eval "db.dropDatabase()" --quiet 2>/dev/null || true
    fi
}
trap cleanup EXIT

# --- Test restore ---
START_TIME=$(date +%s)

if command -v mongorestore &>/dev/null; then
    mongorestore \
        --uri="${TEST_URI}" \
        --archive="${BACKUP_FILE}" \
        --gzip \
        --drop \
        --nsFrom="dmo-kb.*" \
        --nsTo="${TEST_DB}.*" \
        2>>"${LOG_FILE:-/dev/stderr}"
    RESULT=$?
elif docker exec dmo-kb-mongo mongorestore --version &>/dev/null 2>&1; then
    docker exec -i dmo-kb-mongo mongorestore \
        --uri="${TEST_URI}" \
        --archive \
        --gzip \
        --drop \
        --nsFrom="dmo-kb.*" \
        --nsTo="${TEST_DB}.*" \
        < "${BACKUP_FILE}" \
        2>>"${LOG_FILE:-/dev/stderr}"
    RESULT=$?
else
    log_error "mongorestore not found"
    exit 1
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

if [[ ${RESULT} -ne 0 ]]; then
    log_error "VERIFICATION FAILED: mongorestore exited with code ${RESULT}"
    exit 1
fi

# --- Count collections in test DB ---
COLLECTIONS=""
if command -v mongosh &>/dev/null; then
    COLLECTIONS=$(mongosh "${TEST_URI}" --quiet --eval "db.getCollectionNames().length" 2>/dev/null || echo "?")
elif docker exec dmo-kb-mongo mongosh --version &>/dev/null 2>&1; then
    COLLECTIONS=$(docker exec dmo-kb-mongo mongosh "${TEST_URI}" --quiet --eval "db.getCollectionNames().length" 2>/dev/null || echo "?")
elif command -v mongo &>/dev/null; then
    COLLECTIONS=$(mongo "${TEST_URI}" --quiet --eval "db.getCollectionNames().length" 2>/dev/null || echo "?")
elif docker exec dmo-kb-mongo mongo --version &>/dev/null 2>&1; then
    COLLECTIONS=$(docker exec dmo-kb-mongo mongo "${TEST_URI}" --quiet --eval "db.getCollectionNames().length" 2>/dev/null || echo "?")
fi

if [[ "${COLLECTIONS}" == "0" ]] || [[ -z "${COLLECTIONS}" ]]; then
    log_error "VERIFICATION FAILED: test DB has 0 collections after restore"
    exit 1
fi

log_info "============================================"
log_info "BACKUP VERIFICATION PASSED"
log_info "  File:        $(basename "${BACKUP_FILE}")"
log_info "  Size:        $(human_size ${FILESIZE})"
log_info "  Collections: ${COLLECTIONS}"
log_info "  Restore:     ${ELAPSED}s"
log_info "============================================"
exit 0
