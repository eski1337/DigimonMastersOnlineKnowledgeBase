#!/bin/bash
echo "=== 1. Test external email relay ==="
python3 << 'PYEOF'
import smtplib
from email.mime.text import MIMEText

# Test sending to an EXTERNAL address (not @dmokb.info)
# This tests if Mailcow relays outbound mail for authenticated users
try:
    s = smtplib.SMTP('127.0.0.1', 587, timeout=10)
    s.ehlo()
    s.starttls()
    s.login('noreply@dmokb.info', '${NOREPLY_PASSWORD}')
    
    msg = MIMEText('This is a test email from DMO KB to verify external relay works.')
    msg['Subject'] = 'DMO KB - External Relay Test'
    msg['From'] = 'noreply@dmokb.info'
    msg['To'] = 'lubo-random@web.de'  # External address
    
    s.send_message(msg)
    print('  External relay: OK - email sent to lubo-random@web.de')
    s.quit()
except Exception as e:
    print(f'  External relay: FAILED - {e}')
PYEOF

echo ""
echo "=== 2. Check Mailcow relay settings ==="
cd /opt/mailcow-dockerized
sudo docker compose exec -T postfix-mailcow postconf mynetworks 2>/dev/null
sudo docker compose exec -T postfix-mailcow postconf smtpd_relay_restrictions 2>/dev/null | head -3
sudo docker compose exec -T postfix-mailcow postconf smtpd_sasl_auth_enable 2>/dev/null

echo ""
echo "=== 3. Check noreply@dmokb.info mailbox exists ==="
# Check if the noreply mailbox exists in Mailcow
MAILCOW_API_KEY=$(grep API_KEY /opt/mailcow-dockerized/mailcow.conf 2>/dev/null | head -1 | cut -d= -f2)
if [ -n "$MAILCOW_API_KEY" ]; then
  curl -s -H "X-API-Key: $MAILCOW_API_KEY" https://mail.dmokb.info/api/v1/get/mailbox/all | python3 -c "
import json,sys
data=json.load(sys.stdin)
for mb in data:
    print(f'  Mailbox: {mb.get(\"username\",\"?\")} active={mb.get(\"active\",\"?\")}')" 2>/dev/null
else
  echo "  Cannot read API key"
fi

echo ""
echo "=== 4. Check Digimon list in admin ==="
# Login and check if Digimon list loads in admin
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"${CMS_ADMIN_EMAIL}","password":"${CMS_ADMIN_PASSWORD}"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

echo -n "  Digimon list (page 1): "
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=5&sort=-createdAt" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'totalDocs={d[\"totalDocs\"]} totalPages={d[\"totalPages\"]}')
for doc in d['docs'][:3]:
    print(f'    {doc[\"id\"]} - {doc[\"name\"]} (slug={doc.get(\"slug\",\"?\")})')
" 2>/dev/null

echo ""
echo "=== 5. Digimon admin URL test ==="
# Get a real Digimon ID and test admin access
FIRST_ID=$(curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['docs'][0]['id'])" 2>/dev/null)
echo "  Real Digimon ID: $FIRST_ID"
echo "  Admin URL should be: https://cms.dmokb.info/admin/collections/digimon/$FIRST_ID"

echo -n "  API fetch: "
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$FIRST_ID" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'OK - {d[\"name\"]}')" 2>/dev/null

echo ""
echo "=== Done ==="
