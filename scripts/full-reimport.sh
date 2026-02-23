#!/bin/bash
echo "=== Full Digimon Re-Import ==="
echo "Importing ALL Digimon using letter batches"
echo ""

# Use the batch import with letter ranges (more reliable than individual names)
# This is the same mechanism as the batch-import page
LETTERS='["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]'

echo "Starting batch import for ALL letters..."
echo "This will take 30-60 minutes."
echo ""

RESULT=$(curl -s -X POST http://localhost:3001/api/batch-import-digimon \
  -H 'Content-Type: application/json' \
  -d "{\"letters\": $LETTERS}" \
  --max-time 7200)

echo "Initial response: $(echo $RESULT | head -c 200)"
echo ""

# Poll progress every 30 seconds
echo "Polling progress..."
DONE=false
while [ "$DONE" = "false" ]; do
  sleep 30
  PROGRESS=$(curl -s http://localhost:3001/api/batch-import-progress 2>/dev/null)
  STATUS=$(echo $PROGRESS | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('status','?'))" 2>/dev/null)
  
  if [ "$STATUS" = "importing" ] || [ "$STATUS" = "fetching" ]; then
    CURRENT=$(echo $PROGRESS | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'{d.get(\"currentIndex\",0)}/{d.get(\"totalNames\",0)} - {d.get(\"currentName\",\"?\")}')" 2>/dev/null)
    echo "  [$(date +%H:%M:%S)] $STATUS: $CURRENT"
  elif [ "$STATUS" = "complete" ]; then
    echo ""
    echo "=== Import Complete! ==="
    echo "$PROGRESS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Imported: {len(d.get(\"imported\",[]))}')
print(f'Failed: {len(d.get(\"failed\",[]))}')
print(f'Skipped: {d.get(\"skipped\",0)}')
failed = d.get('failed',[])
if failed:
    print(f'\nFailed items (first 10):')
    for f in failed[:10]:
        print(f'  {f.get(\"name\",\"?\")}: {str(f.get(\"error\",\"?\"))[:80]}')
" 2>/dev/null
    DONE=true
  elif [ "$STATUS" = "idle" ]; then
    echo "  Status is idle - import may have completed or not started"
    DONE=true
  else
    echo "  [$(date +%H:%M:%S)] Status: $STATUS"
  fi
done

echo ""
echo "--- Final DB count ---"
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Total Digimon in DB: {d[\"totalDocs\"]}')
" 2>/dev/null

echo ""
echo "=== Done ==="
