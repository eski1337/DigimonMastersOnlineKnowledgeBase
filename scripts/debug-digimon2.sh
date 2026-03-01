#!/bin/bash
echo "=== Debug Digimon Fetch ==="

TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"${CMS_ADMIN_EMAIL}","password":"${CMS_ADMIN_PASSWORD}"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

# Clear CMS logs
pm2 flush cms 2>/dev/null

echo "--- Attempt fetch by ID ---"
FIRST_ID="699b711264d9de1fa1823565"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$FIRST_ID" > /tmp/fetch-result.json 2>&1
cat /tmp/fetch-result.json | head -c 200
echo ""

echo ""
echo "--- CMS logs after fetch ---"
sleep 1
pm2 logs cms --lines 10 --nostream 2>&1 | tail -15

echo ""
echo "--- Test without auth ---"
curl -s "http://localhost:3001/api/digimon/$FIRST_ID" | head -c 200
echo ""

echo ""
echo "--- Test fetch Agumon ID from MongoDB ---"
AGUMON_ID="699aee4d031fd48372888562"
echo "Fetching ID: $AGUMON_ID"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$AGUMON_ID" | head -c 200
echo ""

echo ""
echo "--- Check if there's a depth issue ---"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$FIRST_ID?depth=0" | head -c 200
echo ""

echo ""
echo "--- Check digimon list with where clause ---"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?where[id][equals]=$FIRST_ID&limit=1" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'docs: {len(d.get(\"docs\",[]))} total: {d.get(\"totalDocs\",0)}')" 2>/dev/null

echo ""
echo "--- Check collection names in Payload config ---"
curl -s "http://localhost:3001/api/" | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
    print('API endpoints:', list(d.keys())[:20] if isinstance(d, dict) else str(d)[:200])
except:
    print('Non-JSON response')
" 2>/dev/null

echo ""
echo "--- Try /api/digimons/ (plural) ---"
curl -s "http://localhost:3001/api/digimons/$FIRST_ID" | head -c 200
echo ""

rm -f /tmp/fetch-result.json
echo ""
echo "=== Done ==="
