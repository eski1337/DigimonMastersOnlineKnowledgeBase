#!/bin/bash
echo "=== Test CMS admin login via public URL ==="

echo ""
echo "--- Owner (eski@dmokb.info) ---"
RESULT=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"${CMS_ADMIN_EMAIL}","password":"${CMS_ADMIN_PASSWORD}"}')
echo "  Status: $(echo $RESULT | grep -o '"token":"' >/dev/null && echo 'LOGIN OK' || echo 'FAILED')"
echo "  Role: $(echo $RESULT | grep -o '"role":"[^"]*"')"

echo ""
echo "--- Member (lubo-random@web.de) ---"
# We don't know their password, just check if the endpoint responds
RESULT2=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"lubo-random@web.de","password":"wrong"}')
echo "  Response: $(echo $RESULT2 | head -c 120)"

echo ""
echo "=== Test CMS admin panel loads ==="
echo -n "  /admin: "; curl -s -o /dev/null -w '%{http_code}\n' https://cms.dmokb.info/admin
echo -n "  /admin/login: "; curl -s -o /dev/null -w '%{http_code}\n' https://cms.dmokb.info/admin/login

echo ""
echo "=== Current user list with roles ==="
TOKEN=$(echo $RESULT | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')
USERS=$(curl -s -H "Authorization: JWT $TOKEN" 'https://cms.dmokb.info/api/users?limit=50')
echo "$USERS" | python3 -c "
import json,sys
data=json.load(sys.stdin)
for u in data.get('docs',[]):
    print(f\"  {u['email']:30s} role={u.get('role','?'):10s} verified={u.get('_verified',False)}\")
" 2>/dev/null || echo "  (python3 parse failed, raw): $(echo $USERS | head -c 300)"
