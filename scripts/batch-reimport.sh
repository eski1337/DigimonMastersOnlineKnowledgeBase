#!/bin/bash
echo "=== Batch Re-Import Digimon (small batches) ==="

# Import in batches of 20 names at a time
BATCH_SIZE=20
NAMES_FILE="/home/deploy/app/scripts/digimon-names.json"
TOTAL=$(python3 -c "import json; print(len(json.load(open('$NAMES_FILE'))))")
echo "Total names: $TOTAL"
echo "Batch size: $BATCH_SIZE"
echo ""

TOTAL_IMPORTED=0
TOTAL_FAILED=0
TOTAL_SKIPPED=0

for OFFSET in $(seq 0 $BATCH_SIZE $((TOTAL - 1))); do
  BATCH_NAMES=$(python3 -c "
import json
names = json.load(open('$NAMES_FILE'))
batch = names[$OFFSET:$OFFSET+$BATCH_SIZE]
print(json.dumps(batch))
")
  
  BATCH_COUNT=$(echo "$BATCH_NAMES" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")
  echo "--- Batch $OFFSET-$((OFFSET + BATCH_COUNT - 1)) ($BATCH_COUNT names) ---"
  
  # Wait for any previous batch to finish
  while true; do
    STATUS=$(curl -s http://localhost:3001/api/batch-import-progress | python3 -c "import json,sys;print(json.load(sys.stdin).get('status','idle'))" 2>/dev/null)
    if [ "$STATUS" = "idle" ] || [ "$STATUS" = "complete" ]; then
      break
    fi
    sleep 5
  done
  
  # Start batch
  RESULT=$(curl -s -X POST http://localhost:3001/api/batch-import-digimon \
    -H 'Content-Type: application/json' \
    -d "{\"names\": $BATCH_NAMES}" \
    --max-time 600 2>/dev/null)
  
  IMPORTED=$(echo "$RESULT" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('imported',0))" 2>/dev/null)
  FAILED=$(echo "$RESULT" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('failed',0))" 2>/dev/null)
  SKIPPED=$(echo "$RESULT" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('skipped',0))" 2>/dev/null)
  
  echo "  Imported: $IMPORTED, Failed: $FAILED, Skipped: $SKIPPED"
  
  TOTAL_IMPORTED=$((TOTAL_IMPORTED + ${IMPORTED:-0}))
  TOTAL_FAILED=$((TOTAL_FAILED + ${FAILED:-0}))
  TOTAL_SKIPPED=$((TOTAL_SKIPPED + ${SKIPPED:-0}))
  
  # Small delay between batches
  sleep 2
done

echo ""
echo "=== TOTALS ==="
echo "Imported: $TOTAL_IMPORTED"
echo "Failed: $TOTAL_FAILED"
echo "Skipped: $TOTAL_SKIPPED"

echo ""
echo "--- DB count ---"
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"${CMS_ADMIN_EMAIL}","password":"${CMS_ADMIN_PASSWORD}"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1" | python3 -c "
import json,sys;d=json.load(sys.stdin);print(f'Total Digimon in DB: {d[\"totalDocs\"]}')
" 2>/dev/null

echo ""
echo "=== Done ==="
