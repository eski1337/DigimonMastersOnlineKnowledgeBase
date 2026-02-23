#!/bin/bash
set -e

cd /opt/mailcow-dockerized

# Get DB credentials
DBPASS=$(sudo grep '^DBPASS=' mailcow.conf | cut -d= -f2)

# Check actual domain table schema
echo "=== Domain table schema ==="
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"${DBPASS}" mailcow -e "SHOW COLUMNS FROM domain;" 2>/dev/null

echo ""
echo "=== Mailbox table schema ==="
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"${DBPASS}" mailcow -e "SHOW COLUMNS FROM mailbox;" 2>/dev/null

echo ""
echo "=== Adding domain ==="
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"${DBPASS}" mailcow -e "
INSERT IGNORE INTO domain (domain, description, aliases, mailboxes, defquota, maxquota, quota, backupmx, active, relay_all_recipients, relay_unknown_only, gal, created, modified)
VALUES ('dmokb.info', 'DMO Knowledge Base', 50, 10, 1073741824, 4294967296, 10737418240, 0, 1, 0, 0, 1, NOW(), NOW());
" 2>/dev/null && echo "Domain added!" || echo "Domain failed"

# Get password hash
echo ""
echo "=== Creating eski@dmokb.info ==="
PASS_HASH=$(sudo docker exec mailcowdockerized-dovecot-mailcow-1 doveadm pw -s BLF-CRYPT -p 'EskiDMOKB2026!' 2>/dev/null)

sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"${DBPASS}" mailcow -e "
INSERT IGNORE INTO mailbox (username, password, name, quota, local_part, domain, active, multiple_bookings, kind, created, modified)
VALUES ('eski@dmokb.info', '${PASS_HASH}', 'Eski', 4294967296, 'eski', 'dmokb.info', 1, -1, '', NOW(), NOW());
INSERT IGNORE INTO alias (address, goto, domain, active, created, modified)
VALUES ('eski@dmokb.info', 'eski@dmokb.info', 'dmokb.info', 1, NOW(), NOW());
" 2>/dev/null && echo "Mailbox created!" || echo "Mailbox failed"

echo ""
echo "=== Creating noreply@dmokb.info ==="
PASS_HASH2=$(sudo docker exec mailcowdockerized-dovecot-mailcow-1 doveadm pw -s BLF-CRYPT -p 'NoReplyDMOKB2026!' 2>/dev/null)

sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"${DBPASS}" mailcow -e "
INSERT IGNORE INTO mailbox (username, password, name, quota, local_part, domain, active, multiple_bookings, kind, created, modified)
VALUES ('noreply@dmokb.info', '${PASS_HASH2}', 'No Reply', 1073741824, 'noreply', 'dmokb.info', 1, -1, '', NOW(), NOW());
INSERT IGNORE INTO alias (address, goto, domain, active, created, modified)
VALUES ('noreply@dmokb.info', 'noreply@dmokb.info', 'dmokb.info', 1, NOW(), NOW());
" 2>/dev/null && echo "Noreply created!" || echo "Noreply failed"

# Restart services
echo ""
echo "Restarting dovecot and SOGo..."
sudo docker compose restart dovecot-mailcow sogo-mailcow 2>/dev/null | tail -2

# Verify
echo ""
echo "=== Verification ==="
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"${DBPASS}" mailcow -e "SELECT domain, active FROM domain WHERE domain='dmokb.info';" 2>/dev/null
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"${DBPASS}" mailcow -e "SELECT username, name, active FROM mailbox;" 2>/dev/null

# Send test email
echo ""
echo "=== Sending test email ==="
sudo docker exec mailcowdockerized-postfix-mailcow-1 bash -c 'echo -e "Subject: Test from DMO KB\nFrom: eski@dmokb.info\nTo: lukas.bohn@icloud.com\nContent-Type: text/plain\n\nHello! This is a test email from eski@dmokb.info on the DMO Knowledge Base mail server.\nSent at: $(date)" | sendmail -f eski@dmokb.info lukas.bohn@icloud.com' 2>&1
echo "Test email sent!"
