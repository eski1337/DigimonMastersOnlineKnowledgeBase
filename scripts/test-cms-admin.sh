#!/bin/bash
echo "=== Test CMS Admin Login for Different Roles ==="

# 1. Create test editor user
echo ""
echo "--- Creating test editor user ---"
# Login as owner first
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"${CMS_ADMIN_EMAIL}","password":"${CMS_ADMIN_PASSWORD}"}' | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

# Create editor user via API (as admin, so we can set role)
CREATE=$(curl -s -X POST http://localhost:3001/api/users \
  -H 'Content-Type: application/json' \
  -H "Authorization: JWT $TOKEN" \
  -d '{"email":"testeditor@dmokb.info","password":"${TEST_EDITOR_PASSWORD}","passwordConfirm":"${TEST_EDITOR_PASSWORD}","username":"testeditor","name":"Test Editor","role":"editor","_verified":true}')
echo "  Create editor: $(echo $CREATE | grep -o '"email":"[^"]*"') $(echo $CREATE | grep -o '"role":"[^"]*"')"

# Create admin user via API
CREATE2=$(curl -s -X POST http://localhost:3001/api/users \
  -H 'Content-Type: application/json' \
  -H "Authorization: JWT $TOKEN" \
  -d '{"email":"testadmin@dmokb.info","password":"${TEST_ADMIN_PASSWORD}","passwordConfirm":"${TEST_ADMIN_PASSWORD}","username":"testadmin","name":"Test Admin","role":"admin","_verified":true}')
echo "  Create admin: $(echo $CREATE2 | grep -o '"email":"[^"]*"') $(echo $CREATE2 | grep -o '"role":"[^"]*"')"

# 2. Test login for each role via CMS public URL
echo ""
echo "--- Testing CMS login (via public URL) ---"

# Owner
echo -n "  Owner (eski@dmokb.info): "
R=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"${CMS_ADMIN_EMAIL}","password":"${CMS_ADMIN_PASSWORD}"}')
echo "$R" | grep -q '"token"' && echo "OK - $(echo $R | grep -o '"role":"[^"]*"')" || echo "FAILED: $(echo $R | head -c 100)"

# Editor
echo -n "  Editor (testeditor@dmokb.info): "
R=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"testeditor@dmokb.info","password":"${TEST_EDITOR_PASSWORD}"}')
echo "$R" | grep -q '"token"' && echo "OK - $(echo $R | grep -o '"role":"[^"]*"')" || echo "FAILED: $(echo $R | head -c 100)"

# Admin  
echo -n "  Admin (testadmin@dmokb.info): "
R=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"testadmin@dmokb.info","password":"${TEST_ADMIN_PASSWORD}"}')
echo "$R" | grep -q '"token"' && echo "OK - $(echo $R | grep -o '"role":"[^"]*"')" || echo "FAILED: $(echo $R | head -c 100)"

# Existing admin (ascherous)
echo -n "  Admin (ascherous@gmail.com): "
# Can't test without knowing their password, just check they exist
FIND=$(curl -s -H "Authorization: JWT $TOKEN" 'http://localhost:3001/api/users?where[email][equals]=ascherous@gmail.com&limit=1')
echo "exists - $(echo $FIND | grep -o '"role":"[^"]*"') verified=$(echo $FIND | grep -o '"_verified":[^,]*')"

# Member (should work for API login but we'll restrict admin panel later)
echo -n "  Member (lubo-random@web.de): "
echo "skipping (don't know password)"

# 3. Test admin panel access with token
echo ""
echo "--- Testing admin panel with auth token ---"
# Get editor token
EDITOR_TOKEN=$(curl -s -X POST https://cms.dmokb.info/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"testeditor@dmokb.info","password":"${TEST_EDITOR_PASSWORD}"}' | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

echo -n "  /admin with editor token: "
curl -s -o /dev/null -w '%{http_code}' -H "Authorization: JWT $EDITOR_TOKEN" https://cms.dmokb.info/admin
echo ""

echo -n "  /api/users/me with editor token: "
ME=$(curl -s -H "Authorization: JWT $EDITOR_TOKEN" https://cms.dmokb.info/api/users/me)
echo "$(echo $ME | grep -o '"role":"[^"]*"') $(echo $ME | grep -o '"email":"[^"]*"')"

# 4. Cleanup test users
echo ""
echo "--- Cleanup test users ---"
for email in testeditor@dmokb.info testadmin@dmokb.info verify99@test.com; do
  FIND=$(curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/users?where[email][equals]=$(echo $email | sed 's/@/%40/g')&limit=1")
  VID=$(echo $FIND | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
  if [ -n "$VID" ]; then
    curl -s -X DELETE -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/users/$VID" -o /dev/null
    echo "  Deleted: $email"
  fi
done

echo ""
echo "=== Done ==="
