#!/bin/bash
echo "=== 1. SMTP Test ==="
python3 << 'PYEOF'
import smtplib
from email.mime.text import MIMEText
try:
    s = smtplib.SMTP('127.0.0.1', 587, timeout=5)
    s.ehlo()
    s.starttls()
    s.login('noreply@dmokb.info', 'NoReplyDMOKB2026!')
    msg = MIMEText('SMTP test from diagnose script')
    msg['Subject'] = 'DMO KB SMTP Test'
    msg['From'] = 'noreply@dmokb.info'
    msg['To'] = 'eski@dmokb.info'
    s.send_message(msg)
    print('  SMTP: OK - email sent')
    s.quit()
except Exception as e:
    print(f'  SMTP: FAILED - {e}')
PYEOF

echo ""
echo "=== 2. CMS Email Config ==="
grep -E 'SMTP|EMAIL' ~/app/.env

echo ""
echo "=== 3. CMS logs (email related) ==="
pm2 logs cms --lines 50 --nostream 2>&1 | grep -iE 'email|smtp|mail|verif|send|transport' | tail -15

echo ""
echo "=== 4. CMS logs (recent errors) ==="
pm2 logs cms --lines 20 --nostream 2>&1 | grep -iE 'error|fail|warn' | tail -10

echo ""
echo "=== 5. Digimon collection in CMS ==="
echo -n "  Total docs: "
curl -s http://localhost:3001/api/digimon?limit=1 | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('totalDocs','?'))" 2>/dev/null

echo -n "  First doc ID: "
curl -s http://localhost:3001/api/digimon?limit=1 | python3 -c "import json,sys;d=json.load(sys.stdin);docs=d.get('docs',[]);print(docs[0]['id'] if docs else 'NONE')" 2>/dev/null

echo -n "  Collection slug check: "
curl -s http://localhost:3001/api/digimon?limit=1 | python3 -c "import json,sys;d=json.load(sys.stdin);print('OK' if 'docs' in d else 'FAILED: '+str(d)[:200])" 2>/dev/null

echo ""
echo "=== 6. Test specific Digimon from URL ==="
# URL from screenshot: /admin/collections/digimon/6996711254d9de1fa1623541
DIGIMON_ID="6996711254d9de1fa1623541"
echo -n "  Direct fetch by ID: "
RESULT=$(curl -s http://localhost:3001/api/digimon/$DIGIMON_ID)
echo "$RESULT" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'name={d.get(\"name\",\"?\")} slug={d.get(\"slug\",\"?\")}' if 'name' in d else f'ERROR: {str(d)[:200]}')" 2>/dev/null

echo ""
echo "=== 7. Digimon collection access control ==="
# Login as owner
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

echo -n "  Fetch as owner: "
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$DIGIMON_ID" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'name={d.get(\"name\",\"?\")}' if 'name' in d else f'ERROR: {str(d)[:200]}')" 2>/dev/null

echo -n "  Update test (dry): "
curl -s -X PATCH -H "Authorization: JWT $TOKEN" -H 'Content-Type: application/json' \
  "http://localhost:3001/api/digimon/$DIGIMON_ID" \
  -d '{}' | python3 -c "import json,sys;d=json.load(sys.stdin);print('OK' if d.get('doc') else f'FAILED: {str(d)[:200]}')" 2>/dev/null

echo ""
echo "=== 8. Registration test with email ==="
# Register a test user and check if verification email is sent
REG=$(curl -s -X POST http://localhost:3001/api/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"smtptest@dmokb.info","password":"TestSMTP123!","passwordConfirm":"TestSMTP123!","username":"smtptest","name":"SMTP Test"}')
echo -n "  Registration: "
echo "$REG" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('message','?'))" 2>/dev/null

# Check CMS logs immediately after
sleep 2
echo "  CMS logs after registration:"
pm2 logs cms --lines 10 --nostream 2>&1 | grep -iE 'email|smtp|mail|verif|send|transport|error' | tail -5

# Cleanup
FIND=$(curl -s -H "Authorization: JWT $TOKEN" 'http://localhost:3001/api/users?where[email][equals]=smtptest%40dmokb.info&limit=1')
VID=$(echo "$FIND" | python3 -c "import json,sys;d=json.load(sys.stdin);docs=d.get('docs',[]);print(docs[0]['id'] if docs else '')" 2>/dev/null)
if [ -n "$VID" ]; then
  curl -s -X DELETE -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/users/$VID" -o /dev/null
  echo "  Cleaned up test user"
fi

echo ""
echo "=== Done ==="
