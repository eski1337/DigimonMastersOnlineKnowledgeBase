#!/bin/bash
# Create a mailbox in Mailcow and list existing ones
# Usage: bash scripts/mailcow-create-mailbox.sh [list|create EMAIL NAME PASSWORD]

MAILCOW_DIR="/opt/mailcow-dockerized"
MYSQL_CONTAINER="mailcowdockerized-mysql-mailcow-1"
DOVECOT_CONTAINER="mailcowdockerized-dovecot-mailcow-1"

# Get DB password from container env
DBPASS=$(docker exec "$MYSQL_CONTAINER" printenv MYSQL_PASSWORD 2>/dev/null)
if [ -z "$DBPASS" ]; then
  echo "ERROR: Cannot get MySQL password from container"
  exit 1
fi

run_sql() {
  docker exec "$MYSQL_CONTAINER" mysql -umailcow -p"$DBPASS" mailcow -e "$1" 2>/dev/null
}

case "${1:-list}" in
  list)
    echo "=== Existing Mailboxes ==="
    run_sql "SELECT username, name, active, quota FROM mailbox ORDER BY username;"
    echo ""
    echo "=== Existing Aliases ==="
    run_sql "SELECT address, goto, active FROM alias ORDER BY address;"
    echo ""
    echo "=== Domains ==="
    run_sql "SELECT domain, active FROM domain ORDER BY domain;"
    ;;

  create)
    EMAIL="$2"
    NAME="$3"
    PASSWORD="$4"

    if [ -z "$EMAIL" ] || [ -z "$NAME" ] || [ -z "$PASSWORD" ]; then
      echo "Usage: $0 create EMAIL FULLNAME PASSWORD"
      echo "Example: $0 create AlexHang@dmokb.info 'Alex Hang' 'SecurePass123!'"
      exit 1
    fi

    LOCAL_PART="${EMAIL%%@*}"
    DOMAIN="${EMAIL##*@}"

    echo "Creating mailbox: $EMAIL ($NAME)"
    echo "  Local part: $LOCAL_PART"
    echo "  Domain: $DOMAIN"

    # Hash password using Dovecot
    PASS_HASH=$(docker exec "$DOVECOT_CONTAINER" doveadm pw -s BLF-CRYPT -p "$PASSWORD" 2>/dev/null)
    if [ -z "$PASS_HASH" ]; then
      echo "ERROR: Failed to hash password via Dovecot"
      exit 1
    fi
    echo "  Password hashed ✓"

    # Create mailbox
    run_sql "INSERT INTO mailbox (username, password, name, quota, local_part, domain, active, multiple_bookings, kind, created, modified) VALUES ('$EMAIL', '$PASS_HASH', '$NAME', 4294967296, '$LOCAL_PART', '$DOMAIN', 1, -1, '', NOW(), NOW()) ON DUPLICATE KEY UPDATE password='$PASS_HASH', name='$NAME', active=1, modified=NOW();"
    echo "  Mailbox created ✓"

    # Create alias (required by Mailcow)
    run_sql "INSERT INTO alias (address, goto, domain, active, created, modified) VALUES ('$EMAIL', '$EMAIL', '$DOMAIN', 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE active=1, modified=NOW();"
    echo "  Alias created ✓"

    # Restart Dovecot and SOGo to pick up changes
    echo "  Restarting mail services..."
    cd "$MAILCOW_DIR" 2>/dev/null && docker compose restart dovecot-mailcow sogo-mailcow 2>/dev/null
    echo "  Done! ✓"
    echo ""
    echo "  Webmail login: https://mail.dmokb.info"
    echo "  Email: $EMAIL"
    echo "  IMAP: mail.dmokb.info:993 (SSL)"
    echo "  SMTP: mail.dmokb.info:587 (STARTTLS)"
    ;;

  *)
    echo "Usage: $0 [list|create EMAIL NAME PASSWORD]"
    ;;
esac
