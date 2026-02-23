#!/bin/bash
echo "=== Re-import Digimon from Wiki ==="
echo "Starting batch import using names from digimon-names.json"
echo ""

# First check how many names we have
NAMES_COUNT=$(python3 -c "import json; names=json.load(open('/home/deploy/app/scripts/digimon-names.json')); print(len(names))")
echo "Total names in file: $NAMES_COUNT"

# Start batch import with first 50 names (test batch)
echo ""
echo "--- Starting test batch (first 10 names) ---"
FIRST_10=$(python3 -c "
import json
names = json.load(open('/home/deploy/app/scripts/digimon-names.json'))
print(json.dumps(names[:10]))
")
echo "Names: $FIRST_10"

RESULT=$(curl -s -X POST http://localhost:3001/api/batch-import-digimon \
  -H 'Content-Type: application/json' \
  -d "{\"names\": $FIRST_10}" \
  --max-time 600)
echo "Response: $(echo $RESULT | head -c 300)"

echo ""
echo "--- Check progress ---"
sleep 5
for i in 1 2 3 4 5; do
  PROGRESS=$(curl -s http://localhost:3001/api/batch-import-progress)
  STATUS=$(echo $PROGRESS | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('status','?'))" 2>/dev/null)
  echo "  [$i] Status: $STATUS"
  if [ "$STATUS" = "complete" ] || [ "$STATUS" = "idle" ]; then
    echo "  Done!"
    echo "$PROGRESS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Imported: {len(d.get(\"imported\",[]))}')
print(f'  Failed: {len(d.get(\"failed\",[]))}')
print(f'  Skipped: {d.get(\"skipped\",0)}')
" 2>/dev/null
    break
  fi
  sleep 30
done

echo ""
echo "--- Verify Digimon in DB ---"
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=3" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Total docs: {d[\"totalDocs\"]}')
for doc in d['docs'][:3]:
    print(f'  {doc[\"id\"]} - {doc[\"name\"]} (slug={doc.get(\"slug\",\"?\")})')
" 2>/dev/null

echo ""
echo "--- Test findByID ---"
FIRST_ID=$(curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1" | python3 -c "import json,sys;print(json.load(sys.stdin)['docs'][0]['id'])" 2>/dev/null)
echo "Testing ID: $FIRST_ID"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$FIRST_ID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if 'name' in d:
    print(f'  findByID: OK - {d[\"name\"]}')
else:
    print(f'  findByID: FAILED - {str(d)[:150]}')
" 2>/dev/null

echo ""
echo "=== Test batch done ==="
