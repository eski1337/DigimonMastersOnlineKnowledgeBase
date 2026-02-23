#!/bin/bash
echo "=== Import Progress ==="
tail -20 /tmp/reimport-log.txt
echo ""
echo "=== Batch Import Status ==="
curl -s http://localhost:3001/api/batch-import-progress | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(json.dumps(d, indent=2)[:600])
"
echo ""
echo "=== DB Count ==="
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Total Digimon in DB: {d.get(\"totalDocs\",0)}')
" 2>/dev/null
