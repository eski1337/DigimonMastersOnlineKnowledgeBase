#!/usr/bin/env bash
# =============================================================================
# install-cron.sh — Install daily backup cron job (idempotent)
# =============================================================================
# Usage: ./scripts/backup/install-cron.sh
# Installs:
#   - Daily full backup at 03:00
#   - Weekly verification at 04:00 Sunday
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

BACKUP_SCRIPT="${SCRIPT_DIR}/backup-all.sh"
VERIFY_SCRIPT="${SCRIPT_DIR}/verify-backup.sh"
LOG_FILE_CRON="/var/log/dmokb-backup.log"
CRON_MARKER="# DMOKB-BACKUP"

# --- Ensure scripts are executable ---
chmod +x "${SCRIPT_DIR}"/*.sh
log_info "Made all backup scripts executable"

# --- Ensure log file exists and is writable ---
sudo touch "${LOG_FILE_CRON}" 2>/dev/null || touch "${LOG_FILE_CRON}" 2>/dev/null || true
sudo chmod 666 "${LOG_FILE_CRON}" 2>/dev/null || chmod 666 "${LOG_FILE_CRON}" 2>/dev/null || true

# --- Build cron entries ---
CRON_BACKUP="0 3 * * * ${BACKUP_SCRIPT} >> ${LOG_FILE_CRON} 2>&1 ${CRON_MARKER}"
CRON_VERIFY="0 4 * * 0 ${VERIFY_SCRIPT} >> ${LOG_FILE_CRON} 2>&1 ${CRON_MARKER}-VERIFY"

# --- Load .env in cron (pass MONGODB_URI) ---
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
    MONGO_VAL=$(grep -E '^MONGODB_URI=' "${PROJECT_ROOT}/.env" | head -1 | cut -d= -f2-)
    if [[ -n "${MONGO_VAL}" ]]; then
        CRON_BACKUP="0 3 * * * MONGODB_URI=${MONGO_VAL} ${BACKUP_SCRIPT} >> ${LOG_FILE_CRON} 2>&1 ${CRON_MARKER}"
        CRON_VERIFY="0 4 * * 0 MONGODB_URI=${MONGO_VAL} ${VERIFY_SCRIPT} >> ${LOG_FILE_CRON} 2>&1 ${CRON_MARKER}-VERIFY"
    fi
fi

# --- Remove existing DMOKB cron entries (idempotent) ---
EXISTING_CRON=$(crontab -l 2>/dev/null || true)
CLEANED_CRON=$(echo "${EXISTING_CRON}" | grep -v "${CRON_MARKER}" || true)

# --- Add new entries ---
NEW_CRON="${CLEANED_CRON}
${CRON_BACKUP}
${CRON_VERIFY}"

# Remove blank lines and install
echo "${NEW_CRON}" | sed '/^$/d' | crontab -

log_info "Cron jobs installed:"
log_info "  Daily backup:      03:00 every day"
log_info "  Weekly verify:     04:00 every Sunday"
log_info "  Log file:          ${LOG_FILE_CRON}"
log_info ""
log_info "Current crontab:"
crontab -l | grep "${CRON_MARKER}" || true

# --- Create backup directories ---
sudo mkdir -p /backups/mongo /backups/uploads 2>/dev/null || mkdir -p /backups/mongo /backups/uploads 2>/dev/null || true
log_info "Backup directories ensured: /backups/mongo, /backups/uploads"

# --- Setup logrotate ---
LOGROTATE_CONF="/etc/logrotate.d/dmokb-backup"
if [[ -d "/etc/logrotate.d" ]]; then
    sudo tee "${LOGROTATE_CONF}" > /dev/null 2>/dev/null <<'LOGROTATE' || true
/var/log/dmokb-backup.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 0666 root root
}
LOGROTATE
    log_info "Logrotate configured: ${LOGROTATE_CONF}"
fi

log_info "Cron installation complete"
exit 0
