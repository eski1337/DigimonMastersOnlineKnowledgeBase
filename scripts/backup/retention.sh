#!/usr/bin/env bash
# =============================================================================
# retention.sh — Tiered backup retention policy
# =============================================================================
# Policy:  14 daily / 4 weekly (Sunday) / 6 monthly (1st)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
DAILY_KEEP=14
WEEKLY_KEEP=4
MONTHLY_KEEP=6

log_info "Retention policy: daily=${DAILY_KEEP}, weekly=${WEEKLY_KEEP}, monthly=${MONTHLY_KEEP}"

apply_retention() {
    local dir="$1"
    local pattern="$2"

    if [[ ! -d "${dir}" ]]; then
        return 0
    fi

    local now_epoch
    now_epoch=$(date +%s)
    local daily_cutoff=$((now_epoch - DAILY_KEEP * 86400))
    local weekly_cutoff=$((now_epoch - WEEKLY_KEEP * 7 * 86400))
    local monthly_cutoff=$((now_epoch - MONTHLY_KEEP * 30 * 86400))
    local pruned=0

    while IFS= read -r -d '' file; do
        local fname
        fname="$(basename "${file}")"

        # Extract date from filename: dmokb_YYYY-MM-DD_HH-MM or uploads_YYYY-MM-DD_HH-MM
        local date_str
        date_str=$(echo "${fname}" | grep -oP '\d{4}-\d{2}-\d{2}' | head -1)
        if [[ -z "${date_str}" ]]; then
            continue
        fi

        local file_epoch
        file_epoch=$(date -d "${date_str}" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "${date_str}" +%s 2>/dev/null || echo "0")
        if [[ "${file_epoch}" -eq 0 ]]; then
            continue
        fi

        local day_of_month
        day_of_month=$(date -d "${date_str}" +%d 2>/dev/null || date -j -f "%Y-%m-%d" "${date_str}" +%d 2>/dev/null || echo "0")
        local day_of_week
        day_of_week=$(date -d "${date_str}" +%u 2>/dev/null || date -j -f "%Y-%m-%d" "${date_str}" +%u 2>/dev/null || echo "0")

        local dominated=true

        # Tier 1: Daily — keep if within DAILY_KEEP days
        if [[ "${file_epoch}" -ge "${daily_cutoff}" ]]; then
            dominated=false
        fi

        # Tier 2: Weekly (Sunday=7) — keep if Sunday and within weekly window
        if [[ "${day_of_week}" -eq 7 ]] && [[ "${file_epoch}" -ge "${weekly_cutoff}" ]]; then
            dominated=false
        fi

        # Tier 3: Monthly (1st) — keep if 1st of month and within monthly window
        if [[ "${day_of_month}" -eq "01" ]] && [[ "${file_epoch}" -ge "${monthly_cutoff}" ]]; then
            dominated=false
        fi

        if [[ "${dominated}" == "true" ]]; then
            log_info "Pruning: ${fname}"
            rm -f "${file}"
            pruned=$((pruned + 1))
        fi
    done < <(find "${dir}" -name "${pattern}" -type f -print0 2>/dev/null)

    if [[ ${pruned} -gt 0 ]]; then
        log_info "Pruned ${pruned} file(s) from ${dir}"
    else
        log_info "No files pruned from ${dir}"
    fi
}

apply_retention "${BACKUP_ROOT}/mongo" "dmokb_*.archive.gz"
apply_retention "${BACKUP_ROOT}/uploads" "uploads_*.tar.gz"

log_info "Retention policy applied"
exit 0
