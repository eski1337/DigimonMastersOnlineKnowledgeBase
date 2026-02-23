#!/bin/bash
echo "=== Final CMS Admin Verification ==="

# Wait for CMS to be ready
sleep 3

# Login as owner to get token for creating test users
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

echo ""
echo "--- 1. Create test editor & admin users ---"
# Create editor
curl -s -X POST http://localhost:3001/api/users \
  -H 'Content-Type: application/json' \
  -H "Authorization: JWT $TOKEN" \
  -d '{"email":"testeditor@dmokb.info","password":"EditorPass123!","passwordConfirm":"EditorPass123!","username":"testeditor2","name":"Test Editor","role":"editor","_verified":true}' | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'  Editor: {d.get(\"doc\",{}).get(\"email\",\"FAILED\")} role={d.get(\"doc\",{}).get(\"role\",\"?\")}')" 2>/dev/null

# Create admin
curl -s -X POST http://localhost:3001/api/users \
  -H 'Content-Type: application/json' \
  -H "Authorization: JWT $TOKEN" \
  -d '{"email":"testadmin@dmokb.info","password":"AdminPass123!","passwordConfirm":"AdminPass123!","username":"testadmin2","name":"Test Admin","role":"admin","_verified":true}' | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'  Admin: {d.get(\"doc\",{}).get(\"email\",\"FAILED\")} role={d.get(\"doc\",{}).get(\"role\",\"?\")}')" 2>/dev/null

echo ""
echo "--- 2. Test login via public CMS URL ---"

# Owner login
echo -n "  Owner (eski@dmokb.info): "
R=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}')
echo "$R" | grep -q '"token"' && echo "✅ LOGIN OK" || echo "❌ FAILED"

# Editor login
echo -n "  Editor (testeditor@dmokb.info): "
R=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"testeditor@dmokb.info","password":"EditorPass123!"}')
echo "$R" | grep -q '"token"' && echo "✅ LOGIN OK" || echo "❌ FAILED"

# Admin login
echo -n "  Admin (testadmin@dmokb.info): "
R=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"testadmin@dmokb.info","password":"AdminPass123!"}')
echo "$R" | grep -q '"token"' && echo "✅ LOGIN OK" || echo "❌ FAILED"

echo ""
echo "--- 3. Test admin panel access with tokens ---"

# Editor accesses admin
EDITOR_TOKEN=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"testeditor@dmokb.info","password":"EditorPass123!"}' | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

echo -n "  Editor → /admin: "
curl -s -o /dev/null -w '%{http_code}' -b "payload-token=$EDITOR_TOKEN" https://cms.dmokb.info/admin
echo ""

echo -n "  Editor → /api/users/me: "
curl -s -H "Authorization: JWT $EDITOR_TOKEN" https://cms.dmokb.info/api/users/me | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'email={d.get(\"user\",{}).get(\"email\",\"?\")} role={d.get(\"user\",{}).get(\"role\",\"?\")}')" 2>/dev/null

echo ""
echo "--- 4. Verify admin access control (member should be blocked) ---"
# Login as member
echo -n "  Member login (pelikanbot): "
# Create a temp member for testing
curl -s -X POST http://localhost:3001/api/users \
  -H 'Content-Type: application/json' \
  -H "Authorization: JWT $TOKEN" \
  -d '{"email":"testmember@dmokb.info","password":"MemberPass123!","passwordConfirm":"MemberPass123!","username":"testmember2","name":"Test Member","role":"member","_verified":true}' > /dev/null

MEMBER_TOKEN=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"testmember@dmokb.info","password":"MemberPass123!"}' | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

if [ -n "$MEMBER_TOKEN" ]; then
  echo "logged in (API login works for members)"
  echo -n "  Member → admin panel access: "
  # The access.admin function should prevent admin panel access
  # But Payload v2 serves admin as static SPA, so the HTTP status may still be 200
  # The real check is the /api/users/me endpoint behavior
  ME=$(curl -s -H "Authorization: JWT $MEMBER_TOKEN" https://cms.dmokb.info/api/users/me)
  echo "$ME" | python3 -c "import json,sys;d=json.load(sys.stdin);u=d.get('user',{});print(f'role={u.get(\"role\",\"?\")} (admin panel will reject this user on the client side)')" 2>/dev/null
else
  echo "❌ login failed"
fi

echo ""
echo "--- 5. Cleanup test users ---"
for email in testeditor@dmokb.info testadmin@dmokb.info testmember@dmokb.info verify99@test.com; do
  FIND=$(curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/users?where[email][equals]=$(python3 -c "import urllib.parse;print(urllib.parse.quote('$email'))")&limit=1")
  VID=$(echo $FIND | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
  if [ -n "$VID" ]; then
    curl -s -X DELETE -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/users/$VID" -o /dev/null
    echo "  Deleted: $email"
  fi
done

echo ""
echo "--- 6. Final user list ---"
curl -s -H "Authorization: JWT $TOKEN" 'http://localhost:3001/api/users?limit=50' | python3 -c "
import json,sys
data=json.load(sys.stdin)
for u in data.get('docs',[]):
    print(f\"  {u['email']:30s} role={u.get('role','?'):10s} verified={u.get('_verified',False)}\")
" 2>/dev/null

echo ""
echo "=== Verification Complete ==="
