#!/bin/bash
echo "=== Final Verification ==="
sleep 3

echo ""
echo "--- 1. Registration without email verification ---"
REG=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"regtest99","email":"regtest99@test.com","password":"TestPass123!","confirmPassword":"TestPass123!","name":"Reg Test"}')
echo "  Registration: $(echo $REG | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("message","?")[:80])' 2>/dev/null)"

# Try login immediately (no verification needed)
echo -n "  Auto-login test: "
LOGIN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"regtest99@test.com","password":"TestPass123!"}')
echo "$LOGIN" | grep -q '"token"' && echo "OK - can log in immediately!" || echo "FAILED: $(echo $LOGIN | head -c 100)"

echo ""
echo "--- 2. CMS admin Digimon list ---"
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

echo -n "  Digimon list: "
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=3" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'{d[\"totalDocs\"]} total docs, showing first 3:')
for doc in d['docs'][:3]:
    print(f'    {doc[\"id\"]} - {doc[\"name\"]}')
" 2>/dev/null

echo ""
echo "--- 3. Can edit Digimon ---"
FIRST_ID=$(curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1" | python3 -c "import json,sys;print(json.load(sys.stdin)['docs'][0]['id'])" 2>/dev/null)
echo -n "  Fetch Digimon $FIRST_ID: "
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$FIRST_ID" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'OK - {d[\"name\"]}')" 2>/dev/null

echo -n "  Update Digimon (no-op patch): "
curl -s -X PATCH -H "Authorization: JWT $TOKEN" -H 'Content-Type: application/json' \
  "http://localhost:3001/api/digimon/$FIRST_ID" -d '{}' | python3 -c "import json,sys;d=json.load(sys.stdin);print('OK' if d.get('doc') else f'FAILED: {str(d)[:150]}')" 2>/dev/null

echo ""
echo "--- 4. Can upload media ---"
echo -n "  Media create test: "
# Create a tiny test image
echo -n "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > /tmp/test.png
UPLOAD=$(curl -s -X POST "http://localhost:3001/api/media" \
  -H "Authorization: JWT $TOKEN" \
  -F "file=@/tmp/test.png;filename=test-upload.png;type=image/png" \
  -F "alt=test upload")
echo "$UPLOAD" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'OK - id={d.get(\"doc\",{}).get(\"id\",\"?\")}')" 2>/dev/null

# Cleanup uploaded media
MEDIA_ID=$(echo "$UPLOAD" | python3 -c "import json,sys;print(json.load(sys.stdin).get('doc',{}).get('id',''))" 2>/dev/null)
if [ -n "$MEDIA_ID" ]; then
  curl -s -X DELETE -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/media/$MEDIA_ID" -o /dev/null
  echo "  Cleaned up test media"
fi
rm -f /tmp/test.png

echo ""
echo "--- 5. Admin panel accessible via public URL ---"
echo -n "  CMS admin: "; curl -s -o /dev/null -w '%{http_code}\n' https://cms.dmokb.info/admin
echo -n "  Digimon list admin: "; curl -s -o /dev/null -w '%{http_code}\n' "https://cms.dmokb.info/admin/collections/digimon"
echo "  Correct Digimon edit URL: https://cms.dmokb.info/admin/collections/digimon/$FIRST_ID"

echo ""
echo "--- 6. Cleanup test user ---"
FIND=$(curl -s -H "Authorization: JWT $TOKEN" 'http://localhost:3001/api/users?where[email][equals]=regtest99%40test.com&limit=1')
VID=$(echo "$FIND" | python3 -c "import json,sys;d=json.load(sys.stdin);docs=d.get('docs',[]);print(docs[0]['id'] if docs else '')" 2>/dev/null)
if [ -n "$VID" ]; then
  curl -s -X DELETE -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/users/$VID" -o /dev/null
  echo "  Deleted test user"
fi

echo ""
echo "=== All Done ==="
