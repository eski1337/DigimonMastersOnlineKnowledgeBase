#!/usr/bin/env bash
# =============================================================================
# common.sh — Shared functions for DMOKB Backup System v2
# =============================================================================
# Sourced by all backup/restore scripts. Never executed directly.
# Provides: logging, env loading, lockfile management, mongosh/mongodump
#           detection, file utilities, and safety checks.
# =============================================================================
set -euo pipefail

# --- Paths ---
BACKUP_ROOT="${BACKUP_ROOT:-/home/deploy/backups}"
LOG_DIR="${BACKUP_ROOT}/logs"
LOG_FILE="${LOG_DIR}/backup.log"
LOCK_DIR="${BACKUP_ROOT}/.locks"
METADATA_DIR="${BACKUP_ROOT}/metadata"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/dmo-kb}"
MONGODB_DB="${MONGODB_DB:-dmo-kb}"
# Resolve symlinks for MEDIA_DIR (CMS media/ is often a symlink)
_MEDIA_RAW="${MEDIA_DIR:-/home/deploy/app/apps/cms/media}"
MEDIA_DIR="$(readlink -f "${_MEDIA_RAW}" 2>/dev/null || echo "${_MEDIA_RAW}")"
PROJECT_ROOT="${PROJECT_ROOT:-/home/deploy/app}"

# --- Ensure directories ---
mkdir -p "${LOG_DIR}" "${LOCK_DIR}" "${METADATA_DIR}" 2>/dev/null || true

# =============================================================================
# Logging
# =============================================================================
_log() {
    local level="$1"; shift
    local ts
    ts="$(date '+%Y-%m-%d %H:%M:%S')"
    local msg="[${ts}] [${level}] $*"
    echo "${msg}" >&2
    echo "${msg}" >> "${LOG_FILE}" 2>/dev/null || true
}

log_info()  { _log "INFO"  "$@"; }
log_warn()  { _log "WARN"  "$@"; }
log_error() { _log "ERROR" "$@"; }

# =============================================================================
# Environment loading
# =============================================================================
load_env() {
    local env_file="${1:-${PROJECT_ROOT}/.env}"
    if [[ -f "${env_file}" ]]; then
        set -a
        # shellcheck disable=SC1090
        source <(grep -v '^\s*#' "${env_file}" | grep -v '^\s*$')
        set +a
    fi
}

# =============================================================================
# Lockfile management (flock-based, prevents concurrent backups)
# =============================================================================
LOCK_FD=200

acquire_lock() {
    local lock_name="${1:-backup}"
    local lock_file="${LOCK_DIR}/${lock_name}.lock"
    eval "exec ${LOCK_FD}>${lock_file}"
    if ! flock -n ${LOCK_FD}; then
        log_error "Another backup process is running (lock: ${lock_name}). Aborting."
        exit 1
    fi
    log_info "Lock acquired: ${lock_name}"
}

release_lock() {
    flock -u ${LOCK_FD} 2>/dev/null || true
}

# =============================================================================
# Mongodump / mongorestore / mongosh detection
# =============================================================================
detect_mongo_tool() {
    local tool="$1"
    if command -v "${tool}" &>/dev/null; then
        echo "local"
    elif docker exec dmo-kb-mongo "${tool}" --version &>/dev/null 2>&1; then
        echo "docker"
    else
        log_error "${tool} not found (neither locally nor in dmo-kb-mongo container)"
        return 1
    fi
}

# Run a mongosh command. Accepts script as stdin or argument.
run_mongosh() {
    local mode
    mode=$(detect_mongo_tool mongosh) || exit 1
    if [[ "${mode}" == "docker" ]]; then
        docker exec -i dmo-kb-mongo mongosh "${MONGODB_URI}" --quiet "$@"
    else
        mongosh "${MONGODB_URI}" --quiet "$@"
    fi
}

# =============================================================================
# File utilities
# =============================================================================
file_size() {
    stat -c%s "$1" 2>/dev/null || stat -f%z "$1" 2>/dev/null || echo "0"
}

human_size() {
    local raw="${1:-0}"
    # Strip any non-digit characters (quotes, commas, whitespace, etc)
    local bytes="${raw//[^0-9]/}"
    bytes="${bytes:-0}"
    if [[ "${bytes}" -ge 1073741824 ]]; then
        echo "$(echo "scale=2; ${bytes}/1073741824" | bc) GB"
    elif [[ "${bytes}" -ge 1048576 ]]; then
        echo "$(echo "scale=2; ${bytes}/1048576" | bc) MB"
    elif [[ "${bytes}" -ge 1024 ]]; then
        echo "$(echo "scale=2; ${bytes}/1024" | bc) KB"
    else
        echo "${bytes} B"
    fi
}

timestamp() {
    date +%Y-%m-%d_%H-%M
}

date_ymd() {
    date +%Y-%m-%d
}

# =============================================================================
# Metadata helpers — write/read JSON-like metadata for each backup
# =============================================================================
write_metadata() {
    local file="$1"
    shift
    # Remaining args are key=value pairs
    {
        echo "{"
        local first=true
        for kv in "$@"; do
            local key="${kv%%=*}"
            local val="${kv#*=}"
            if [[ "${first}" == "true" ]]; then
                first=false
            else
                echo ","
            fi
            printf '  "%s": "%s"' "${key}" "${val}"
        done
        echo ""
        echo "}"
    } > "${file}"
}

read_metadata_value() {
    local file="$1"
    local key="$2"
    # Extract value for both string ("key": "val") and numeric ("key": 123) JSON fields
    local line
    line=$(grep "\"${key}\"" "${file}" 2>/dev/null | head -1)
    [[ -z "${line}" ]] && return
    # Try string value first, then numeric/boolean
    local val
    val=$(echo "${line}" | sed -n 's/.*"'"${key}"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    if [[ -z "${val}" ]]; then
        # Numeric or boolean: strip key, colon, whitespace, trailing comma
        val=$(echo "${line}" | sed 's/.*"'"${key}"'"[[:space:]]*:[[:space:]]*//' | sed 's/[, ]*$//' | tr -d '"')
    fi
    echo "${val}"
}

# =============================================================================
# Disk space protection
# =============================================================================
check_disk_space() {
    local required_mb="${1:-512}"
    local free_mb
    free_mb=$(df -Pm "${BACKUP_ROOT}" 2>/dev/null | awk 'NR==2 {print $4}')
    if [[ -z "${free_mb}" ]]; then
        log_warn "Could not determine free disk space — proceeding anyway"
        return 0
    fi
    if [[ "${free_mb}" -lt "${required_mb}" ]]; then
        log_error "Not enough disk space: ${free_mb} MB free, ${required_mb} MB required"
        send_alert "BACKUP ABORTED — only ${free_mb} MB free (need ${required_mb} MB)"
        exit 1
    fi
    log_info "Disk space OK: ${free_mb} MB free (need ${required_mb} MB)"
}

# =============================================================================
# Backup index — append entry to /backups/metadata/backups.json
# =============================================================================
INDEX_FILE="${METADATA_DIR}/backups.json"

append_backup_index() {
    local type="$1"
    local ts="$2"
    local file_path="$3"
    local size_bytes="${4:-0}"
    local failures="${5:-0}"

    # Initialize index if missing
    if [[ ! -f "${INDEX_FILE}" ]]; then
        echo '[]' > "${INDEX_FILE}"
    fi

    local verified="false"
    local entry
    entry=$(cat <<ENTRY
{"type":"${type}","timestamp":"${ts}","file":"${file_path}","sizeBytes":${size_bytes},"failures":${failures},"verified":${verified}}
ENTRY
)

    # Append to JSON array (keep last 200 entries)
    local tmp="${INDEX_FILE}.tmp"
    if command -v python3 &>/dev/null; then
        python3 -c "
import json, sys
try:
    with open('${INDEX_FILE}') as f: arr = json.load(f)
except: arr = []
arr.append(json.loads('${entry}'))
arr = arr[-200:]
with open('${tmp}', 'w') as f: json.dump(arr, f, indent=2)
" 2>/dev/null && mv "${tmp}" "${INDEX_FILE}" || true
    else
        # Fallback: just append as newline-delimited JSON
        echo "${entry}" >> "${INDEX_FILE}.ndjson"
    fi
}

# =============================================================================
# Health status file — /backups/metadata/backup-health.json
# =============================================================================
HEALTH_FILE="${METADATA_DIR}/backup-health.json"

write_health_status() {
    local last_full=""
    local last_incr=""
    local last_verify="unknown"
    local status="healthy"

    [[ -f "${METADATA_DIR}/last_full_iso" ]] && last_full=$(cat "${METADATA_DIR}/last_full_iso")
    [[ -f "${METADATA_DIR}/last_incremental_iso" ]] && last_incr=$(cat "${METADATA_DIR}/last_incremental_iso")

    # Parse last verification from log
    if [[ -f "${LOG_FILE}" ]]; then
        if grep -q "VERIFICATION — ALL PASSED" "${LOG_FILE}" 2>/dev/null; then
            last_verify="passed"
        elif grep -q "VERIFICATION.*FAILURE" "${LOG_FILE}" 2>/dev/null; then
            last_verify="failed"
            status="degraded"
        fi
    fi

    # Check staleness
    if [[ -n "${last_full}" ]]; then
        local full_epoch
        full_epoch=$(date -d "${last_full}" +%s 2>/dev/null || echo "0")
        local now_epoch
        now_epoch=$(date +%s)
        local age_hours=$(( (now_epoch - full_epoch) / 3600 ))
        if [[ ${age_hours} -gt 25 ]]; then
            status="stale"
        fi
    else
        status="no_backups"
    fi

    local disk_usage_total
    disk_usage_total=$(du -sm "${BACKUP_ROOT}" 2>/dev/null | cut -f1 || echo "0")

    cat > "${HEALTH_FILE}" <<EOF
{
  "last_full_backup": "${last_full}",
  "last_incremental": "${last_incr}",
  "last_verification": "${last_verify}",
  "disk_usage_mb": ${disk_usage_total},
  "status": "${status}",
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

# =============================================================================
# Discord / webhook alerting
# =============================================================================
send_alert() {
    local message="$1"
    log_warn "ALERT: ${message}"

    # Resolve webhook URL lazily (after load_env has been called)
    local webhook="${DISCORD_BACKUP_WEBHOOK:-}"
    if [[ -n "${webhook}" ]]; then
        curl -s -o /dev/null -X POST "${webhook}" \
            -H "Content-Type: application/json" \
            -d "{\"content\":\"🚨 **DMOKB Backup Alert**\\n${message}\"}" \
            2>/dev/null || log_warn "Failed to send Discord alert"
    fi

    # Also write to a dedicated alerts file for CMS to pick up
    local alert_file="${METADATA_DIR}/last_alert.json"
    cat > "${alert_file}" <<EOF
{
  "message": "${message}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "level": "error"
}
EOF
}

# =============================================================================
# Safety: confirm in interactive mode
# =============================================================================
confirm_action() {
    local message="${1:-Continue?}"
    if [[ -t 0 ]]; then
        echo ""
        echo "WARNING: ${message}"
        echo ""
        read -rp "Type 'yes' to continue: " CONFIRM
        if [[ "${CONFIRM}" != "yes" ]]; then
            log_info "Action cancelled by user"
            exit 0
        fi
    fi
}
