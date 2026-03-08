#!/usr/bin/env bash
# =============================================================================
# restore.sh — Interactive restore manager for DMOKB backups
# =============================================================================
# Usage:
#   ./restore.sh                          # Interactive menu
#   ./restore.sh full [date]              # Restore full backup (latest or date)
#   ./restore.sh collection <name> [date] # Restore single collection
#   ./restore.sh incremental [timestamp]  # Apply incremental on top of full
#   ./restore.sh uploads [timestamp]      # Restore uploads snapshot
#   ./restore.sh list                     # List all available backups
#
# Safety:
#   - Always asks for confirmation in interactive mode
#   - Creates a pre-restore snapshot before destructive operations
#   - Supports --no-snapshot to skip pre-restore safety backup
#   - Supports --drop for full/collection restores (default: merge)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"
load_env

# --- Defaults ---
DROP_FLAG=""
NO_SNAPSHOT=false
DRY_RUN=false
MODE="${1:-menu}"
shift || true

# --- Parse global flags ---
POSITIONAL=()
for arg in "$@"; do
    case "${arg}" in
        --drop) DROP_FLAG="--drop" ;;
        --no-snapshot) NO_SNAPSHOT=true ;;
        --dry-run) DRY_RUN=true ;;
        *) POSITIONAL+=("${arg}") ;;
    esac
done
set -- "${POSITIONAL[@]+"${POSITIONAL[@]}"}"

# =============================================================================
# Helpers
# =============================================================================

list_full_backups() {
    echo "=== Full Backups ==="
    if [[ -d "${BACKUP_ROOT}/full" ]]; then
        for dir in $(ls -rd "${BACKUP_ROOT}"/full/*/ 2>/dev/null); do
            local manifest="${dir}manifest.json"
            local date_name
            date_name=$(basename "${dir}")
            if [[ -f "${manifest}" ]]; then
                local mongo_size
                mongo_size=$(read_metadata_value "${manifest}" "mongoSizeBytes")
                local failures
                failures=$(read_metadata_value "${manifest}" "failures")
                printf "  %-14s  mongo: %s  status: %s\n" \
                    "${date_name}" \
                    "$(human_size "${mongo_size:-0}")" \
                    "$([ "${failures:-0}" = "0" ] && echo "OK" || echo "FAILED")"
            else
                printf "  %-14s  (no manifest)\n" "${date_name}"
            fi
        done
    else
        echo "  (none)"
    fi
    echo ""
}

list_collection_backups() {
    echo "=== Collection Backups ==="
    if [[ -d "${BACKUP_ROOT}/collections" ]]; then
        for coll_dir in "${BACKUP_ROOT}"/collections/*/; do
            local coll_name
            coll_name=$(basename "${coll_dir}")
            local count
            count=$(ls "${coll_dir}"*.archive.gz 2>/dev/null | wc -l || true)
            local latest
            latest=$(ls -t "${coll_dir}"*.archive.gz 2>/dev/null | head -1 || true)
            if [[ ${count} -gt 0 ]] && [[ -n "${latest}" ]]; then
                local size
                size=$(file_size "${latest}")
                printf "  %-30s  %d backups  latest: %s (%s)\n" \
                    "${coll_name}" "${count}" "$(basename "${latest}")" "$(human_size "${size}")"
            fi
        done
    else
        echo "  (none)"
    fi
    echo ""
}

list_incremental_backups() {
    echo "=== Incremental Backups ==="
    if [[ -d "${BACKUP_ROOT}/incremental" ]]; then
        local count
        count=$(ls -d "${BACKUP_ROOT}"/incremental/*/ 2>/dev/null | wc -l || true)
        echo "  ${count} incremental snapshots"
        # Show last 5
        for dir in $(ls -rd "${BACKUP_ROOT}"/incremental/*/ 2>/dev/null | head -5 || true); do
            local ts_name
            ts_name=$(basename "${dir}")
            local manifest="${dir}manifest.json"
            if [[ -f "${manifest}" ]]; then
                local docs
                docs=$(read_metadata_value "${manifest}" "mongoChangedDocs")
                local files
                files=$(read_metadata_value "${manifest}" "uploadsChangedFiles")
                printf "  %-20s  mongo: %s docs  uploads: %s files\n" \
                    "${ts_name}" "${docs:-0}" "${files:-0}"
            else
                printf "  %-20s\n" "${ts_name}"
            fi
        done
        if [[ ${count} -gt 5 ]]; then
            echo "  ... and $((count - 5)) more"
        fi
    else
        echo "  (none)"
    fi
    echo ""
}

list_upload_snapshots() {
    echo "=== Upload Snapshots ==="
    if [[ -d "${BACKUP_ROOT}/uploads" ]]; then
        for dir in $(ls -rd "${BACKUP_ROOT}"/uploads/*/  2>/dev/null | grep -v latest | head -5 || true); do
            local ts_name
            ts_name=$(basename "${dir}")
            local manifest="${dir}manifest.json"
            if [[ -f "${manifest}" ]]; then
                local fcount
                fcount=$(read_metadata_value "${manifest}" "snapshotFiles")
                local disk
                disk=$(read_metadata_value "${manifest}" "diskUsageBytes")
                printf "  %-20s  %s files  disk: %s\n" \
                    "${ts_name}" "${fcount:-?}" "$(human_size "${disk:-0}")"
            else
                printf "  %-20s\n" "${ts_name}"
            fi
        done
    else
        echo "  (none)"
    fi
    echo ""
}

# --- Pre-restore safety snapshot ---
create_pre_restore_snapshot() {
    if [[ "${NO_SNAPSHOT}" == "true" ]]; then
        log_warn "Skipping pre-restore snapshot (--no-snapshot)"
        return 0
    fi

    local snap_ts
    snap_ts="$(timestamp)"
    local snap_file="${BACKUP_ROOT}/metadata/pre_restore_${snap_ts}.archive.gz"

    log_info "Creating pre-restore safety snapshot..."
    local dump_mode
    dump_mode=$(detect_mongo_tool mongodump) || return 1

    if [[ "${dump_mode}" == "docker" ]]; then
        docker exec dmo-kb-mongo mongodump \
            --uri="${MONGODB_URI}" \
            --archive --gzip \
            > "${snap_file}" 2>>"${LOG_FILE}" || true
    else
        mongodump \
            --uri="${MONGODB_URI}" \
            --archive="${snap_file}" \
            --gzip \
            2>>"${LOG_FILE}" || true
    fi

    if [[ -f "${snap_file}" ]]; then
        local size
        size=$(file_size "${snap_file}")
        log_info "Pre-restore snapshot: ${snap_file} ($(human_size "${size}"))"
    else
        log_warn "Pre-restore snapshot failed — proceeding anyway"
    fi
}

# =============================================================================
# Restore: Full
# =============================================================================
restore_full() {
    local date_arg="${1:-latest}"

    local full_dir=""
    if [[ "${date_arg}" == "latest" ]]; then
        full_dir=$(ls -rd "${BACKUP_ROOT}"/full/*/ 2>/dev/null | head -1)
    else
        full_dir="${BACKUP_ROOT}/full/${date_arg}"
    fi

    if [[ -z "${full_dir}" ]] || [[ ! -d "${full_dir}" ]]; then
        log_error "Full backup not found: ${date_arg}"
        list_full_backups
        exit 1
    fi

    local mongo_file
    mongo_file=$(ls "${full_dir}"/mongo_full_*.archive.gz 2>/dev/null | head -1)
    if [[ -z "${mongo_file}" ]]; then
        log_error "No MongoDB archive in ${full_dir}"
        exit 1
    fi

    local size
    size=$(file_size "${mongo_file}")
    log_info "Restoring full backup from: $(basename "${full_dir}")"
    log_info "  MongoDB: $(basename "${mongo_file}") ($(human_size "${size}"))"
    [[ -n "${DROP_FLAG}" ]] && log_warn "  Mode: DROP (existing data will be replaced)"

    # --- DRY RUN ---
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo ""
        echo "=== DRY RUN ==="
        echo "  Restore type:  full"
        echo "  Source:         $(basename "${full_dir}")"
        echo "  MongoDB file:  $(basename "${mongo_file}") ($(human_size "${size}"))"
        echo "  Drop mode:     ${DROP_FLAG:-merge (no --drop)}"
        # Show collection counts from manifest if available
        local manifest="${full_dir}/manifest.json"
        if [[ -f "${manifest}" ]]; then
            echo "  Collections in backup:"
            grep -oP '"[a-z-]+"\s*:\s*\d+' "${manifest}" 2>/dev/null | head -20 | while read -r line; do
                echo "    ${line}"
            done
        fi
        # Check for uploads snapshot reference
        local snap_ref
        snap_ref=$(read_metadata_value "${manifest}" "uploadsSnapshot" 2>/dev/null || echo "")
        if [[ -n "${snap_ref}" ]]; then
            echo "  Uploads snapshot: ${snap_ref}"
        fi
        echo ""
        echo "  NO CHANGES MADE (dry run)"
        echo "================"
        return 0
    fi

    confirm_action "This will restore the FULL database from $(basename "${full_dir}"). Existing data may be overwritten."

    create_pre_restore_snapshot

    local restore_mode
    restore_mode=$(detect_mongo_tool mongorestore) || exit 1

    local start
    start=$(date +%s)

    if [[ "${restore_mode}" == "docker" ]]; then
        docker exec -i dmo-kb-mongo mongorestore \
            --uri="${MONGODB_URI}" \
            --archive --gzip \
            ${DROP_FLAG} \
            < "${mongo_file}" 2>>"${LOG_FILE}"
    else
        mongorestore \
            --uri="${MONGODB_URI}" \
            --archive="${mongo_file}" \
            --gzip \
            ${DROP_FLAG} \
            2>>"${LOG_FILE}"
    fi

    local end
    end=$(date +%s)
    log_info "Full MongoDB restore complete ($((end - start))s)"

    # Check if there's a linked uploads snapshot to restore from
    local manifest="${full_dir}/manifest.json"
    local snap_ref=""
    if [[ -f "${manifest}" ]]; then
        snap_ref=$(read_metadata_value "${manifest}" "uploadsSnapshot" 2>/dev/null || echo "")
    fi
    if [[ -n "${snap_ref}" ]] && [[ -d "${BACKUP_ROOT}/uploads/${snap_ref}/media" ]]; then
        log_info "Restoring uploads from snapshot: ${snap_ref}"
        mkdir -p "${MEDIA_DIR}"
        rsync -a --delete "${BACKUP_ROOT}/uploads/${snap_ref}/media/" "${MEDIA_DIR}/" 2>>"${LOG_FILE}"
        log_info "Uploads restore complete"
    fi

    log_info "=== FULL RESTORE COMPLETE ==="
}

# =============================================================================
# Restore: Single Collection
# =============================================================================
restore_collection() {
    local coll_name="${1:-}"
    local date_arg="${2:-latest}"

    if [[ -z "${coll_name}" ]]; then
        echo "Usage: $0 collection <name> [date]"
        echo ""
        list_collection_backups
        exit 1
    fi

    local coll_dir="${BACKUP_ROOT}/collections/${coll_name}"
    if [[ ! -d "${coll_dir}" ]]; then
        log_error "No backups found for collection: ${coll_name}"
        list_collection_backups
        exit 1
    fi

    local archive=""
    if [[ "${date_arg}" == "latest" ]]; then
        archive=$(ls -t "${coll_dir}"/*.archive.gz 2>/dev/null | head -1)
    else
        archive=$(ls "${coll_dir}"/${coll_name}_${date_arg}*.archive.gz 2>/dev/null | head -1)
    fi

    if [[ -z "${archive}" ]] || [[ ! -f "${archive}" ]]; then
        log_error "Archive not found for ${coll_name} at ${date_arg}"
        exit 1
    fi

    local size
    size=$(file_size "${archive}")
    log_info "Restoring collection: ${coll_name}"
    log_info "  Archive: $(basename "${archive}") ($(human_size "${size}"))"
    [[ -n "${DROP_FLAG}" ]] && log_warn "  Mode: DROP (collection will be replaced)"

    # --- DRY RUN ---
    if [[ "${DRY_RUN}" == "true" ]]; then
        # Read doc count from metadata if available
        local meta="${archive%.archive.gz}.meta.json"
        local doc_count="?"
        if [[ -f "${meta}" ]]; then
            doc_count=$(read_metadata_value "${meta}" "documentCount" 2>/dev/null || echo "?")
        fi
        local live_count
        live_count=$(run_mongosh --eval "print(db.getCollection('${coll_name}').countDocuments())" 2>/dev/null || echo "?")
        echo ""
        echo "=== DRY RUN ==="
        echo "  Restore type:  collection"
        echo "  Collection:    ${coll_name}"
        echo "  Archive:       $(basename "${archive}")"
        echo "  Archive size:  $(human_size "${size}")"
        echo "  Documents:     ${doc_count} (in backup)"
        echo "  Live count:    ${live_count} (current)"
        echo "  Drop mode:     ${DROP_FLAG:-merge (no --drop)}"
        echo ""
        echo "  NO CHANGES MADE (dry run)"
        echo "================"
        return 0
    fi

    confirm_action "This will restore the '${coll_name}' collection. ${DROP_FLAG:+Existing data will be DROPPED.}"

    create_pre_restore_snapshot

    local restore_mode
    restore_mode=$(detect_mongo_tool mongorestore) || exit 1

    local start
    start=$(date +%s)

    if [[ "${restore_mode}" == "docker" ]]; then
        docker exec -i dmo-kb-mongo mongorestore \
            --uri="${MONGODB_URI}" \
            --nsInclude="${MONGODB_DB}.${coll_name}" \
            --archive --gzip \
            ${DROP_FLAG} \
            < "${archive}" 2>>"${LOG_FILE}"
    else
        mongorestore \
            --uri="${MONGODB_URI}" \
            --nsInclude="${MONGODB_DB}.${coll_name}" \
            --archive="${archive}" \
            --gzip \
            ${DROP_FLAG} \
            2>>"${LOG_FILE}"
    fi

    local end
    end=$(date +%s)

    # Show restored count
    local new_count
    new_count=$(run_mongosh --eval "print(db.getCollection('${coll_name}').countDocuments())" 2>/dev/null || echo "?")
    log_info "Collection '${coll_name}' restored: ${new_count} documents ($((end - start))s)"
}

# =============================================================================
# Restore: Incremental (apply on top of current state)
# =============================================================================
restore_incremental() {
    local ts_arg="${1:-latest}"

    local incr_dir=""
    if [[ "${ts_arg}" == "latest" ]]; then
        incr_dir=$(ls -rd "${BACKUP_ROOT}"/incremental/*/ 2>/dev/null | head -1)
    else
        incr_dir="${BACKUP_ROOT}/incremental/${ts_arg}"
    fi

    if [[ -z "${incr_dir}" ]] || [[ ! -d "${incr_dir}" ]]; then
        log_error "Incremental backup not found: ${ts_arg}"
        list_incremental_backups
        exit 1
    fi

    log_info "Applying incremental: $(basename "${incr_dir}")"

    confirm_action "This will apply incremental changes from $(basename "${incr_dir}") using upsert (no data deleted)."

    create_pre_restore_snapshot

    # Apply MongoDB changes
    if [[ -d "${incr_dir}/mongo" ]]; then
        local import_mode
        import_mode=$(detect_mongo_tool mongoimport 2>/dev/null || echo "mongosh")

        for json_file in "${incr_dir}"/mongo/*.json; do
            [[ ! -f "${json_file}" ]] && continue
            local coll
            coll=$(basename "${json_file}" .json)

            if [[ "${import_mode}" == "local" ]]; then
                mongoimport \
                    --uri="${MONGODB_URI}" \
                    --collection="${coll}" \
                    --mode=upsert \
                    --file="${json_file}" \
                    2>>"${LOG_FILE}" || log_warn "Failed to import ${coll}"
            elif [[ "${import_mode}" == "docker" ]]; then
                docker exec -i dmo-kb-mongo mongoimport \
                    --uri="${MONGODB_URI}" \
                    --collection="${coll}" \
                    --mode=upsert \
                    < "${json_file}" \
                    2>>"${LOG_FILE}" || log_warn "Failed to import ${coll}"
            else
                log_warn "mongoimport not available — cannot apply ${coll} incremental"
            fi
            log_info "  Applied ${coll}"
        done
    fi

    # Apply uploads changes
    if [[ -d "${incr_dir}/uploads" ]]; then
        local file_count
        file_count=$(find "${incr_dir}/uploads" -type f 2>/dev/null | wc -l)
        if [[ ${file_count} -gt 0 ]]; then
            rsync -a "${incr_dir}/uploads/" "${MEDIA_DIR}/" 2>>"${LOG_FILE}"
            log_info "  Applied ${file_count} upload files"
        fi
    fi

    log_info "=== INCREMENTAL RESTORE COMPLETE ==="
}

# =============================================================================
# Restore: Uploads only
# =============================================================================
restore_uploads() {
    local ts_arg="${1:-latest}"

    local snap_dir=""
    if [[ "${ts_arg}" == "latest" ]]; then
        if [[ -L "${BACKUP_ROOT}/uploads/latest" ]]; then
            snap_dir=$(readlink -f "${BACKUP_ROOT}/uploads/latest")
        else
            snap_dir=$(ls -rd "${BACKUP_ROOT}"/uploads/*/media 2>/dev/null | head -1)
            snap_dir=$(dirname "${snap_dir}" 2>/dev/null || true)
        fi
    else
        snap_dir="${BACKUP_ROOT}/uploads/${ts_arg}"
    fi

    if [[ -z "${snap_dir}" ]] || [[ ! -d "${snap_dir}/media" ]]; then
        log_error "Upload snapshot not found: ${ts_arg}"
        list_upload_snapshots
        exit 1
    fi

    local file_count
    file_count=$(find "${snap_dir}/media" -type f 2>/dev/null | wc -l)
    log_info "Restoring uploads from: $(basename "${snap_dir}") (${file_count} files)"

    confirm_action "This will sync uploads from backup to ${MEDIA_DIR}. New files in the live directory not in the backup will be DELETED."

    mkdir -p "${MEDIA_DIR}"
    rsync -a --delete "${snap_dir}/media/" "${MEDIA_DIR}/" 2>>"${LOG_FILE}"

    local restored
    restored=$(find "${MEDIA_DIR}" -type f 2>/dev/null | wc -l)
    log_info "Uploads restored: ${restored} files"
}

# =============================================================================
# Interactive Menu
# =============================================================================
show_menu() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║     DMOKB Backup Restore Manager        ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    list_full_backups
    list_collection_backups
    list_incremental_backups
    list_upload_snapshots
    echo "=== Actions ==="
    echo "  1) Restore full backup"
    echo "  2) Restore single collection"
    echo "  3) Apply incremental backup"
    echo "  4) Restore uploads"
    echo "  5) List all backups"
    echo "  q) Quit"
    echo ""
    read -rp "Choose action [1-5/q]: " CHOICE

    case "${CHOICE}" in
        1)
            read -rp "Date (YYYY-MM-DD) or 'latest': " D
            read -rp "Drop existing data? (yes/no): " DR
            [[ "${DR}" == "yes" ]] && DROP_FLAG="--drop"
            restore_full "${D:-latest}"
            ;;
        2)
            read -rp "Collection name: " CN
            read -rp "Date or 'latest': " D
            read -rp "Drop existing collection? (yes/no): " DR
            [[ "${DR}" == "yes" ]] && DROP_FLAG="--drop"
            restore_collection "${CN}" "${D:-latest}"
            ;;
        3)
            read -rp "Timestamp or 'latest': " T
            restore_incremental "${T:-latest}"
            ;;
        4)
            read -rp "Timestamp or 'latest': " T
            restore_uploads "${T:-latest}"
            ;;
        5)
            list_full_backups
            list_collection_backups
            list_incremental_backups
            list_upload_snapshots
            ;;
        q|Q) exit 0 ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac
}

# =============================================================================
# Main dispatcher
# =============================================================================
case "${MODE}" in
    full)           restore_full "${1:-latest}" ;;
    collection)     restore_collection "${1:-}" "${2:-latest}" ;;
    incremental)    restore_incremental "${1:-latest}" ;;
    uploads)        restore_uploads "${1:-latest}" ;;
    list)
        list_full_backups
        list_collection_backups
        list_incremental_backups
        list_upload_snapshots
        ;;
    menu|"")        show_menu ;;
    *)
        echo "Usage: $0 {full|collection|incremental|uploads|list} [args]"
        echo "       $0                  # interactive menu"
        exit 1
        ;;
esac
