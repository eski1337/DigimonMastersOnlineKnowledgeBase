#!/bin/bash
echo "=== Final End-to-End Verification ==="

TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"${CMS_ADMIN_EMAIL}","password":"${CMS_ADMIN_PASSWORD}"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

echo ""
echo "--- 1. Digimon count in CMS ---"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Total: {d.get(\"totalDocs\",0)}')
" 2>/dev/null

echo ""
echo "--- 2. findByID test (CMS API) ---"
FIRST_ID=$(curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1&sort=name" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['docs'][0]['id'])" 2>/dev/null)
FIRST_NAME=$(curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$FIRST_ID" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('name','FAILED'))" 2>/dev/null)
echo "  ID: $FIRST_ID -> Name: $FIRST_NAME"
echo "  Admin URL: https://cms.dmokb.info/admin/collections/digimon/$FIRST_ID"

echo ""
echo "--- 3. Update test (editor can edit) ---"
curl -s -X PATCH -H "Authorization: JWT $TOKEN" -H 'Content-Type: application/json' \
  "http://localhost:3001/api/digimon/$FIRST_ID" -d '{}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
if d.get('doc'): print('  Update: OK')
else: print(f'  Update: FAILED - {str(d)[:150]}')
" 2>/dev/null

echo ""
echo "--- 4. Web frontend Digimon list ---"
curl -s "https://dmokb.info/api/digimon?limit=3" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Total on website: {d.get(\"totalDocs\",0)}')
for doc in d.get('docs',[])[:3]:
    print(f'    {doc[\"name\"]} (slug={doc.get(\"slug\",\"?\")}, id={doc[\"id\"]})')
" 2>/dev/null

echo ""
echo "--- 5. Web detail page (by slug) ---"
curl -s -o /dev/null -w '  Status: %{http_code}\n' "https://dmokb.info/digimon/agumon"

echo ""
echo "--- 6. CMS admin panel ---"
curl -s -o /dev/null -w '  Admin panel: %{http_code}\n' "https://cms.dmokb.info/admin"
curl -s -o /dev/null -w '  Digimon list: %{http_code}\n' "https://cms.dmokb.info/admin/collections/digimon"

echo ""
echo "--- 7. Sample Digimon from each attribute ---"
for attr in Data Vaccine Virus Unknown; do
  NAME=$(curl -s "http://localhost:3001/api/digimon?where[attribute][equals]=$attr&limit=1" | python3 -c "import json,sys;d=json.load(sys.stdin);docs=d.get('docs',[]);print(docs[0]['name'] if docs else 'NONE')" 2>/dev/null)
  COUNT=$(curl -s "http://localhost:3001/api/digimon?where[attribute][equals]=$attr&limit=1" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('totalDocs',0))" 2>/dev/null)
  echo "  $attr: $COUNT Digimon (e.g. $NAME)"
done

echo ""
echo "--- 8. Registration test (no email verification) ---"
REG=$(curl -s -X POST http://localhost:3001/api/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"e2etest@test.com","password":"TestE2E123!","passwordConfirm":"TestE2E123!","username":"e2etest99","name":"E2E Test"}')
echo -n "  Register: "
echo "$REG" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('message','?')[:60])" 2>/dev/null

LOGIN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"e2etest@test.com","password":"TestE2E123!"}')
echo -n "  Login immediately: "
echo "$LOGIN" | python3 -c "import json,sys;d=json.load(sys.stdin);print('OK' if d.get('token') else 'FAILED')" 2>/dev/null

# Cleanup
VID=$(curl -s -H "Authorization: JWT $TOKEN" 'http://localhost:3001/api/users?where[email][equals]=e2etest%40test.com&limit=1' | python3 -c "import json,sys;d=json.load(sys.stdin);docs=d.get('docs',[]);print(docs[0]['id'] if docs else '')" 2>/dev/null)
if [ -n "$VID" ]; then
  curl -s -X DELETE -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/users/$VID" -o /dev/null
  echo "  Cleaned up test user"
fi

echo ""
echo "=== All Checks Complete ==="
