#!/usr/bin/env bash
# =============================================================================
# backup-collections.sh — Per-collection MongoDB backups
# =============================================================================
# Usage: ./scripts/backup-v2/backup-collections.sh [collection_name]
# Runs: once per day (via cron)
#
# If no argument given, backs up ALL key collections.
# If a collection name is given, backs up only that one.
#
# Output:
#   /home/deploy/backups/collections/<collection>/
#       <collection>_YYYY-MM-DD_HH-MM.archive.gz
#       <collection>_YYYY-MM-DD_HH-MM.meta.json
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"
load_env

acquire_lock "backup"
check_disk_space 256

TS="$(timestamp)"
DAY="$(date_ymd)"
COLL_ROOT="${BACKUP_ROOT}/collections"

# Key collections to back up individually
ALL_COLLECTIONS=(
    digimons
    items
    guides
    tools
    systems
    maps
    evolution-edges
    evolution-lines
    evolution-graph-layouts
    media
    users
    patchnotes
    events
    quests
)

# If a specific collection is requested
if [[ -n "${1:-}" ]]; then
    ALL_COLLECTIONS=("$1")
fi

FAILURES=0
TOTAL_START=$(date +%s)

log_info "========================================"
log_info "COLLECTION BACKUP — Starting (${TS})"
log_info "  Collections: ${#ALL_COLLECTIONS[@]}"
log_info "========================================"

DUMP_MODE=$(detect_mongo_tool mongodump) || { log_error "mongodump not found"; exit 1; }

SUMMARY=""

for COLL in "${ALL_COLLECTIONS[@]}"; do
    COLL_DIR="${COLL_ROOT}/${COLL}"
    mkdir -p "${COLL_DIR}"

    ARCHIVE="${COLL_DIR}/${COLL}_${TS}.archive.gz"
    META="${COLL_DIR}/${COLL}_${TS}.meta.json"

    START=$(date +%s)

    # Get document count before backup
    DOC_COUNT=$(run_mongosh --eval "print(db.getCollection('${COLL}').countDocuments())" 2>/dev/null || echo "0")

    # Dump single collection
    RESULT=0
    if [[ "${DUMP_MODE}" == "docker" ]]; then
        docker exec dmo-kb-mongo mongodump \
            --uri="${MONGODB_URI}" \
            --collection="${COLL}" \
            --archive --gzip \
            > "${ARCHIVE}" 2>>"${LOG_FILE}" || RESULT=$?
    else
        mongodump \
            --uri="${MONGODB_URI}" \
            --collection="${COLL}" \
            --archive="${ARCHIVE}" \
            --gzip \
            2>>"${LOG_FILE}" || RESULT=$?
    fi

    END=$(date +%s)
    ELAPSED=$((END - START))

    if [[ ${RESULT} -ne 0 ]] || [[ ! -f "${ARCHIVE}" ]]; then
        log_error "  ${COLL}: FAILED (exit ${RESULT})"
        rm -f "${ARCHIVE}" "${META}"
        FAILURES=$((FAILURES + 1))
        SUMMARY="${SUMMARY}  ${COLL}: FAILED\n"
        continue
    fi

    ARCHIVE_SIZE=$(file_size "${ARCHIVE}")

    # Skip empty collections (archive < 256 bytes is just headers)
    if [[ "${DOC_COUNT}" == "0" ]]; then
        log_info "  ${COLL}: 0 documents — skipping"
        rm -f "${ARCHIVE}" "${META}"
        continue
    fi

    # Write metadata
    cat > "${META}" <<EOF
{
  "collection": "${COLL}",
  "timestamp": "${TS}",
  "documentCount": ${DOC_COUNT},
  "archiveSizeBytes": ${ARCHIVE_SIZE},
  "archiveFile": "$(basename "${ARCHIVE}")"
}
EOF

    log_info "  ${COLL}: ${DOC_COUNT} docs, $(human_size ${ARCHIVE_SIZE}), ${ELAPSED}s"
    SUMMARY="${SUMMARY}  ${COLL}: ${DOC_COUNT} docs ($(human_size ${ARCHIVE_SIZE}))\n"
done

# --- Summary ---
TOTAL_END=$(date +%s)
TOTAL_ELAPSED=$((TOTAL_END - TOTAL_START))

log_info "========================================"
if [[ ${FAILURES} -eq 0 ]]; then
    log_info "COLLECTION BACKUP — SUCCESS (${TOTAL_ELAPSED}s)"
else
    log_error "COLLECTION BACKUP — ${FAILURES} FAILURE(S) (${TOTAL_ELAPSED}s)"
fi
printf '%b' "${SUMMARY}" | while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ -n "${line}" ]] && log_info "${line}"
done || true
log_info "========================================"

release_lock
exit ${FAILURES}
