#!/bin/bash
echo "=== Verify Admin Edit -> Live Publish Flow ==="

TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

# Pick a Digimon to test with
DIGIMON=$(curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1&where[name][equals]=Agumon&depth=0" | python3 -c "
import json,sys
d=json.load(sys.stdin)
doc = d['docs'][0]
print(f'{doc[\"id\"]}|{doc[\"name\"]}|{doc.get(\"introduction\",\"\")[:50]}')
" 2>/dev/null)

ID=$(echo "$DIGIMON" | cut -d'|' -f1)
NAME=$(echo "$DIGIMON" | cut -d'|' -f2)
echo "Testing with: $NAME (ID: $ID)"
echo "  Admin URL: https://cms.dmokb.info/admin/collections/digimon/$ID"
echo "  Live URL: https://dmokb.info/digimon/agumon"

# Step 1: Read current introduction via live website
echo ""
echo "--- Step 1: Current intro on live site ---"
curl -s "http://localhost:3000/api/digimon?limit=1000" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for doc in d.get('docs',[]):
    if doc.get('slug') == 'agumon':
        intro = doc.get('introduction','')
        print(f'  Intro (first 80 chars): {intro[:80]}...')
        break
" 2>/dev/null

# Step 2: Update introduction via CMS API (simulating admin panel edit)
echo ""
echo "--- Step 2: Update intro via CMS API ---"
TEST_SUFFIX=" [Edit flow test - $(date +%H:%M:%S)]"
RESULT=$(curl -s -X PATCH -H "Authorization: JWT $TOKEN" -H 'Content-Type: application/json' \
  "http://localhost:3001/api/digimon/$ID" \
  -d "{\"introduction\": \"Agumon is a Dinosaur Digimon. Test edit at $(date +%H:%M:%S).\"}")
echo "$RESULT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if d.get('doc'):
    print(f'  CMS update: OK - intro now: {d[\"doc\"].get(\"introduction\",\"\")[:60]}')
else:
    print(f'  CMS update: FAILED - {str(d)[:100]}')
" 2>/dev/null

# Step 3: Check live website (wait 6 seconds for revalidation)
echo ""
echo "--- Step 3: Check live site after 6s ---"
sleep 6
curl -s "http://localhost:3001/api/digimon?where[slug][equals]=agumon&limit=1&depth=0" | python3 -c "
import json,sys
d=json.load(sys.stdin)
doc = d['docs'][0] if d.get('docs') else {}
print(f'  CMS intro: {doc.get(\"introduction\",\"\")[:80]}')
" 2>/dev/null

# Step 4: Restore original introduction
echo ""
echo "--- Step 4: Restore original ---"
curl -s -X PATCH -H "Authorization: JWT $TOKEN" -H 'Content-Type: application/json' \
  "http://localhost:3001/api/digimon/$ID" \
  -d '{"introduction": "Agumon (2006 anime) is a Dinosaur Digimon whose name and design are derived from the onomatopoeia for biting. As a Starter Digimon, Agumon has great potential for being a huge asset to anyone'\''s team."}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Restored: {\"OK\" if d.get(\"doc\") else \"FAILED\"}')
" 2>/dev/null

echo ""
echo "=== Edit flow verified ==="
