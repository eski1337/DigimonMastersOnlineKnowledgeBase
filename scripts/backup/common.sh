#!/usr/bin/env bash
# =============================================================================
# common.sh — Shared logging and utility functions for backup scripts
# =============================================================================
# Sourced by all backup/restore scripts. Never executed directly.
# =============================================================================

set -euo pipefail

# --- Logging ---
LOG_FILE="${LOG_FILE:-/var/log/dmokb-backup.log}"

_log() {
    local level="$1"; shift
    local ts
    ts="$(date '+%Y-%m-%d %H:%M:%S')"
    local msg="[${ts}] [${level}] $*"
    echo "${msg}" >&2
    # Append to log file if writable
    if [[ -w "$(dirname "${LOG_FILE}")" ]] || [[ -w "${LOG_FILE}" ]]; then
        echo "${msg}" >> "${LOG_FILE}" 2>/dev/null || true
    fi
}

log_info()  { _log "INFO"  "$@"; }
log_warn()  { _log "WARN"  "$@"; }
log_error() { _log "ERROR" "$@"; }

# --- Load .env if present ---
load_env() {
    local env_file="${1:-.env}"
    if [[ -f "${env_file}" ]]; then
        set -a
        # shellcheck disable=SC1090
        source <(grep -v '^\s*#' "${env_file}" | grep -v '^\s*$')
        set +a
        log_info "Loaded environment from ${env_file}"
    fi
}

# --- Require a command to exist ---
require_cmd() {
    local cmd="$1"
    if ! command -v "${cmd}" &>/dev/null; then
        log_error "Required command not found: ${cmd}"
        exit 1
    fi
}

# --- Human-readable file size ---
human_size() {
    local bytes="${1:-0}"
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

# --- Get file size cross-platform ---
file_size() {
    stat -c%s "$1" 2>/dev/null || stat -f%z "$1" 2>/dev/null || echo "0"
}
