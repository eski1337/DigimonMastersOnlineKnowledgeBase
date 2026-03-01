#!/bin/bash
# Fix AlexHang's Mailcow password
DBPASS="MfNTPRxFZj2Dj0k57bFGaUD9S5LH"

# Check if mailbox exists
echo "=== Checking mailbox ==="
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"$DBPASS" mailcow -e "SELECT username,active FROM mailbox WHERE username LIKE '%alex%';"

# If exists, update password using doveadm
echo "=== Setting password via doveadm ==="
sudo docker exec mailcowdockerized-dovecot-mailcow-1 doveadm pw -s SSHA256 -p 'DmoKb_Alex2026!' > /tmp/mailcow_hash.txt
HASH=$(cat /tmp/mailcow_hash.txt)
echo "Hash: $HASH"

sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"$DBPASS" mailcow -e "UPDATE mailbox SET password='$HASH' WHERE username='alexhang@dmokb.info';"
echo "Update result: $?"

# Also try AlexHang@dmokb.info in case that's the stored email
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"$DBPASS" mailcow -e "UPDATE mailbox SET password='$HASH' WHERE username='AlexHang@dmokb.info';"

# Verify
echo "=== Verify ==="
sudo docker exec mailcowdockerized-mysql-mailcow-1 mysql -umailcow -p"$DBPASS" mailcow -e "SELECT username,active FROM mailbox WHERE username LIKE '%alex%';"

rm -f /tmp/mailcow_hash.txt
