#!/bin/bash
set -e

MAILCOW_URL="http://127.0.0.1:8080"

# 1. Add domain dmokb.info
echo "Adding domain dmokb.info..."
curl -s -X POST "$MAILCOW_URL/api/v1/add/domain" \
  -H "Content-Type: application/json" \
  -u "admin:moohoo" \
  -d '{
    "domain": "dmokb.info",
    "description": "DMO Knowledge Base",
    "aliases": 50,
    "mailboxes": 10,
    "defquota": 1024,
    "maxquota": 4096,
    "quota": 10240,
    "active": 1,
    "restart_sogo": 1
  }' | python3 -m json.tool 2>/dev/null || echo "Response received"

sleep 2

# 2. Create mailbox eski@dmokb.info
echo ""
echo "Creating mailbox eski@dmokb.info..."
curl -s -X POST "$MAILCOW_URL/api/v1/add/mailbox" \
  -H "Content-Type: application/json" \
  -u "admin:moohoo" \
  -d '{
    "local_part": "eski",
    "domain": "dmokb.info",
    "name": "Eski",
    "password": "EskiDMOKB2026!",
    "password2": "EskiDMOKB2026!",
    "quota": 4096,
    "active": 1,
    "force_pw_update": 0,
    "tls_enforce_in": 0,
    "tls_enforce_out": 0
  }' | python3 -m json.tool 2>/dev/null || echo "Response received"

# 3. Create noreply@dmokb.info for system emails
echo ""
echo "Creating mailbox noreply@dmokb.info..."
curl -s -X POST "$MAILCOW_URL/api/v1/add/mailbox" \
  -H "Content-Type: application/json" \
  -u "admin:moohoo" \
  -d '{
    "local_part": "noreply",
    "domain": "dmokb.info",
    "name": "No Reply",
    "password": "NoReplyDMOKB2026!",
    "password2": "NoReplyDMOKB2026!",
    "quota": 1024,
    "active": 1,
    "force_pw_update": 0
  }' | python3 -m json.tool 2>/dev/null || echo "Response received"

echo ""
echo "=== Setup Complete ==="
echo "Login: https://mail.dmokb.info"
echo "Admin: admin / moohoo (CHANGE THIS!)"
echo "Mailbox: eski@dmokb.info / EskiDMOKB2026!"
echo "System: noreply@dmokb.info / NoReplyDMOKB2026!"
