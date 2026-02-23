#!/bin/bash
set -e

# Get DB credentials from mailcow.conf
DBPASS=$(sudo grep '^DBPASS=' /opt/mailcow-dockerized/mailcow.conf | cut -d= -f2)
DBUSER=$(sudo grep '^DBUSER=' /opt/mailcow-dockerized/mailcow.conf | cut -d= -f2)
DBNAME=$(sudo grep '^DBNAME=' /opt/mailcow-dockerized/mailcow.conf | cut -d= -f2)

echo "DB: $DBUSER@$DBNAME"

# Add domain via MySQL
echo "Adding domain dmokb.info..."
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -u"$DBUSER" -p"$DBPASS" "$DBNAME" -e "
INSERT IGNORE INTO domain (domain, description, aliases, mailboxes, defquota, maxquota, quota, transport, backupmx, active, relay_all_recipients, relay_unknown_only, gal)
VALUES ('dmokb.info', 'DMO Knowledge Base', 50, 10, 1073741824, 4294967296, 10737418240, 'dovecot', 0, 1, 0, 0, 1);
" 2>&1 && echo "Domain added" || echo "Domain add failed"

# Generate password hash for eski@dmokb.info
echo ""
echo "Creating mailbox eski@dmokb.info..."
PASS_HASH=$(sudo docker exec mailcowdockerized-dovecot-mailcow-1 doveadm pw -s BLF-CRYPT -p 'EskiDMOKB2026!' 2>/dev/null)
echo "Password hash: ${PASS_HASH:0:20}..."

sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -u"$DBUSER" -p"$DBPASS" "$DBNAME" -e "
INSERT IGNORE INTO mailbox (username, password, name, maildir, quota, local_part, domain, active, multiple_bookings, kind)
VALUES ('eski@dmokb.info', '$PASS_HASH', 'Eski', 'dmokb.info/eski/', 4294967296, 'eski', 'dmokb.info', 1, -1, '');
INSERT IGNORE INTO alias (address, goto, domain, active)
VALUES ('eski@dmokb.info', 'eski@dmokb.info', 'dmokb.info', 1);
" 2>&1 && echo "Mailbox created" || echo "Mailbox creation failed"

# Create noreply mailbox
echo ""
echo "Creating noreply@dmokb.info..."
PASS_HASH2=$(sudo docker exec mailcowdockerized-dovecot-mailcow-1 doveadm pw -s BLF-CRYPT -p 'NoReplyDMOKB2026!' 2>/dev/null)
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -u"$DBUSER" -p"$DBPASS" "$DBNAME" -e "
INSERT IGNORE INTO mailbox (username, password, name, maildir, quota, local_part, domain, active, multiple_bookings, kind)
VALUES ('noreply@dmokb.info', '$PASS_HASH2', 'No Reply', 'dmokb.info/noreply/', 1073741824, 'noreply', 'dmokb.info', 1, -1, '');
INSERT IGNORE INTO alias (address, goto, domain, active)
VALUES ('noreply@dmokb.info', 'noreply@dmokb.info', 'dmokb.info', 1);
" 2>&1 && echo "Noreply mailbox created" || echo "Noreply creation failed"

# Restart dovecot and SOGo to pick up changes
echo ""
echo "Restarting services..."
cd /opt/mailcow-dockerized
sudo docker compose restart dovecot-mailcow sogo-mailcow 2>/dev/null

# Verify
echo ""
echo "=== Verification ==="
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -u"$DBUSER" -p"$DBPASS" "$DBNAME" -e "SELECT domain, active FROM domain;" 2>&1
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -u"$DBUSER" -p"$DBPASS" "$DBNAME" -e "SELECT username, name, active FROM mailbox;" 2>&1

echo ""
echo "=== Done ==="
echo "Webmail: https://mail.dmokb.info (login: eski@dmokb.info / EskiDMOKB2026!)"
echo "Admin: https://mail.dmokb.info (login: admin / moohoo)"
