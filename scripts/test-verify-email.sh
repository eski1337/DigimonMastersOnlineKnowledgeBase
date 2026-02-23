#!/bin/bash
echo "=== Test registration email flow ==="

# Register with EXTERNAL email to test if verification email is sent
echo "Registering test user with external email..."
REG=$(curl -s -X POST http://localhost:3001/api/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"lubo-random@web.de","password":"TestVerify123!","passwordConfirm":"TestVerify123!","username":"emailtest99","name":"Email Test"}')
echo "  Registration response:"
echo "$REG" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:500])" 2>/dev/null

echo ""
echo "=== CMS logs after registration ==="
sleep 3
pm2 logs cms --lines 20 --nostream 2>&1 | grep -iE 'email|smtp|mail|verif|send|transport|noreply|error' | tail -15

echo ""
echo "=== Check Mailcow mail log ==="
cd /opt/mailcow-dockerized
sudo docker compose logs --tail=20 postfix-mailcow 2>/dev/null | grep -iE 'noreply|relay|reject|sent|deliver|lubo' | tail -10

echo ""
echo "=== Cleanup ==="
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

FIND=$(curl -s -H "Authorization: JWT $TOKEN" 'http://localhost:3001/api/users?where[username][equals]=emailtest99&limit=1')
VID=$(echo "$FIND" | python3 -c "import json,sys;d=json.load(sys.stdin);docs=d.get('docs',[]);print(docs[0]['id'] if docs else '')" 2>/dev/null)
if [ -n "$VID" ]; then
  curl -s -X DELETE -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/users/$VID" -o /dev/null
  echo "  Cleaned up test user"
else
  echo "  No test user to clean (registration may have failed - email already exists?)"
fi
