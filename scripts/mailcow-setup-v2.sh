#!/bin/bash
set -e

# Use external HTTPS URL through nginx proxy
MC="https://mail.dmokb.info"

echo "=== Checking API access ==="
curl -s "$MC/api/v1/get/status/containers" -u "admin:moohoo" | head -c 200
echo ""

echo ""
echo "=== Adding domain dmokb.info ==="
curl -s -X POST "$MC/api/v1/add/domain" \
  -H "Content-Type: application/json" \
  -u "admin:moohoo" \
  -d '{"domain":"dmokb.info","description":"DMO Knowledge Base","aliases":50,"mailboxes":10,"defquota":1024,"maxquota":4096,"quota":10240,"active":1,"restart_sogo":1}'
echo ""

sleep 3

echo ""
echo "=== Creating eski@dmokb.info ==="
curl -s -X POST "$MC/api/v1/add/mailbox" \
  -H "Content-Type: application/json" \
  -u "admin:moohoo" \
  -d '{"local_part":"eski","domain":"dmokb.info","name":"Eski","password":"EskiDMOKB2026!","password2":"EskiDMOKB2026!","quota":4096,"active":1,"force_pw_update":"0","tls_enforce_in":"0","tls_enforce_out":"0"}'
echo ""

echo ""
echo "=== Creating noreply@dmokb.info ==="
curl -s -X POST "$MC/api/v1/add/mailbox" \
  -H "Content-Type: application/json" \
  -u "admin:moohoo" \
  -d '{"local_part":"noreply","domain":"dmokb.info","name":"No Reply","password":"NoReplyDMOKB2026!","password2":"NoReplyDMOKB2026!","quota":1024,"active":1,"force_pw_update":"0"}'
echo ""

echo ""
echo "=== Verifying ==="
echo "Domains:"
curl -s "$MC/api/v1/get/domain/all" -u "admin:moohoo" | head -c 200
echo ""
echo "Mailboxes:"
curl -s "$MC/api/v1/get/mailbox/all" -u "admin:moohoo" | head -c 300
echo ""

echo ""
echo "=== Sending test email to lukas.bohn@icloud.com ==="
# Use swaks if available, otherwise use curl to send via Postfix
which swaks >/dev/null 2>&1 && {
  swaks --to lukas.bohn@icloud.com \
    --from eski@dmokb.info \
    --server 127.0.0.1 \
    --port 587 \
    --auth LOGIN \
    --auth-user eski@dmokb.info \
    --auth-password 'EskiDMOKB2026!' \
    --tls \
    --header "Subject: Test from DMO KB" \
    --body "Hello! This is a test email from eski@dmokb.info on the DMO Knowledge Base mail server." \
    2>&1 | tail -5
} || {
  echo "swaks not installed, trying sendmail..."
  echo -e "Subject: Test from DMO KB\nFrom: eski@dmokb.info\nTo: lukas.bohn@icloud.com\n\nHello! This is a test email from eski@dmokb.info" | \
    sudo docker exec -i mailcowdockerized-postfix-mailcow-1 sendmail -f eski@dmokb.info lukas.bohn@icloud.com 2>&1
  echo "Email queued via sendmail"
}
