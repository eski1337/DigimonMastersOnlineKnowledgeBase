#!/bin/bash
set -e

cd /opt/mailcow-dockerized

# Generate config non-interactively
cat > mailcow.conf << 'EOF'
MAILCOW_HOSTNAME=mail.dmokb.info
MAILCOW_PASS_SCHEME=BLF-CRYPT
DBNAME=mailcow
DBUSER=mailcow
DBPASS=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 24)
DBROOT=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 24)

TZ=Europe/Berlin
COMPOSE_PROJECT_NAME=mailcowdockerized

# Use non-standard ports since nginx handles 80/443
HTTP_PORT=8080
HTTPS_PORT=8443
HTTP_BIND=127.0.0.1
HTTPS_BIND=127.0.0.1

SMTP_PORT=25
SMTPS_PORT=465
SUBMISSION_PORT=587
IMAP_PORT=143
IMAPS_PORT=993
POP_PORT=110
POPS_PORT=995
SIEVE_PORT=4190

# Skip Let's Encrypt inside Mailcow (nginx handles SSL)
SKIP_LETS_ENCRYPT=y

# Memory optimization for 4GB VPS
SKIP_CLAMD=y
SKIP_SOLR=y

# API key
API_KEY=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
API_ALLOW_FROM=127.0.0.1

# Additional settings
ALLOW_ADMIN_EMAIL_LOGIN=y
ACL_ANYONE=disallow
MAILDIR_GC_TIME=7200

LOG_LINES=9999
WATCHDOG_NOTIFY_EMAIL=
WATCHDOG_NOTIFY_BAN=n
WATCHDOG_EXTERNAL_CHECKS=n
WATCHDOG_MYSQL_REPLICATION_CHECKS=n

IPV4_NETWORK=172.22.1
IPV6_NETWORK=fd4d:6169:6c63:6f77::/64
SNAT_TO_SOURCE=
SNAT6_TO_SOURCE=

ADDITIONAL_SAN=
ADDITIONAL_SERVER_NAMES=

REDIS_PORT=127.0.0.1:7654
DOVECOT_MASTER_USER=
DOVECOT_MASTER_PASS=

# No Solr (saves RAM)
SOLR_HEAP=256
SKIP_SOLR=y
EOF

# Fix: generate actual random passwords (the $() doesn't expand inside single-quoted heredoc)
DBPASS_REAL=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 24)
DBROOT_REAL=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 24)
API_KEY_REAL=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
sed -i "s|^DBPASS=.*|DBPASS=${DBPASS_REAL}|" mailcow.conf
sed -i "s|^DBROOT=.*|DBROOT=${DBROOT_REAL}|" mailcow.conf
sed -i "s|^API_KEY=.*|API_KEY=${API_KEY_REAL}|" mailcow.conf

echo "Config generated. Starting Mailcow..."
sudo docker compose pull 2>&1 | tail -5
sudo docker compose up -d 2>&1 | tail -10

echo ""
echo "=== Mailcow starting ==="
echo "Wait ~2 min for containers to fully start"
echo "Admin URL: https://mail.dmokb.info (after nginx setup)"
echo "Default login: admin / ${MAILCOW_ADMIN_PASSWORD}"
