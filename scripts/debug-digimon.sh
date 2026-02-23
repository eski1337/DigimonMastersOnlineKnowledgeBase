#!/bin/bash
echo "=== Debug Digimon API ==="

TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

echo "Token: $(echo $TOKEN | head -c 20)..."

echo ""
echo "--- List digimon (first 2) ---"
LIST=$(curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=2")
echo "$LIST" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'totalDocs: {d[\"totalDocs\"]}')
for doc in d['docs']:
    print(f'  id={doc[\"id\"]} name={doc[\"name\"]} slug={doc.get(\"slug\",\"?\")}')
    print(f'    type(id)={type(doc[\"id\"]).__name__} len={len(doc[\"id\"])}')
" 2>/dev/null

echo ""
echo "--- Direct fetch by first ID ---"
FIRST_ID=$(echo "$LIST" | python3 -c "import json,sys;print(json.load(sys.stdin)['docs'][0]['id'])" 2>/dev/null)
echo "ID: $FIRST_ID"

echo "Response:"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$FIRST_ID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if 'errors' in d:
    print(f'ERROR: {d}')
elif 'name' in d:
    print(f'OK: {d[\"name\"]} (id={d[\"id\"]})')
else:
    print(f'Unknown response: {str(d)[:300]}')
" 2>/dev/null

echo ""
echo "--- Fetch by slug ---"
SLUG=$(echo "$LIST" | python3 -c "import json,sys;print(json.load(sys.stdin)['docs'][0].get('slug',''))" 2>/dev/null)
echo "Slug: $SLUG"
echo "Response:"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?where[slug][equals]=$SLUG&limit=1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
docs = d.get('docs',[])
if docs:
    print(f'OK: {docs[0][\"name\"]} (id={docs[0][\"id\"]})')
else:
    print(f'Empty: {str(d)[:200]}')
" 2>/dev/null

echo ""
echo "--- Raw fetch response for first ID ---"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$FIRST_ID" | head -c 500

echo ""
echo ""
echo "--- Check MongoDB collection name ---"
# Check if the actual MongoDB collection is 'digimon' or 'digimons'
python3 << 'PYEOF'
import subprocess, json
# Use mongosh to check
result = subprocess.run(['mongosh', '--quiet', '--eval', 'db.getCollectionNames().forEach(c => { if (c.toLowerCase().includes("digi")) print(c) })', 'mongodb://localhost:27017/dmo-kb'], capture_output=True, text=True, timeout=10)
print("Collections with 'digi':", result.stdout.strip())

# Count in 'digimon' collection
result2 = subprocess.run(['mongosh', '--quiet', '--eval', 'print(db.digimon.countDocuments())', 'mongodb://localhost:27017/dmo-kb'], capture_output=True, text=True, timeout=10)
print("Count in 'digimon':", result2.stdout.strip())

# Count in 'digimons' collection  
result3 = subprocess.run(['mongosh', '--quiet', '--eval', 'print(db.digimons.countDocuments())', 'mongodb://localhost:27017/dmo-kb'], capture_output=True, text=True, timeout=10)
print("Count in 'digimons':", result3.stdout.strip())

# Get first doc from each
result4 = subprocess.run(['mongosh', '--quiet', '--eval', 'let d=db.digimon.findOne(); if(d) print(d._id+" "+d.name); else print("empty")', 'mongodb://localhost:27017/dmo-kb'], capture_output=True, text=True, timeout=10)
print("First in 'digimon':", result4.stdout.strip())

result5 = subprocess.run(['mongosh', '--quiet', '--eval', 'let d=db.digimons.findOne(); if(d) print(d._id+" "+d.name); else print("empty")', 'mongodb://localhost:27017/dmo-kb'], capture_output=True, text=True, timeout=10)
print("First in 'digimons':", result5.stdout.strip())
PYEOF

echo ""
echo "=== Done ==="
