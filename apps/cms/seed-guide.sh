#!/bin/bash
cd /home/deploy/app

# Login to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"'"$1"'"}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))')

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not get auth token. Usage: bash seed-guide.sh <password>"
  exit 1
fi
echo "Got auth token"

# Check if guide already exists
EXISTS=$(curl -s "http://localhost:3001/api/guides?where[slug][equals]=true-digivice&limit=1" \
  -H "Authorization: JWT $TOKEN" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("totalDocs",0))')

if [ "$EXISTS" -gt 0 ]; then
  echo "Guide already exists, skipping creation"
  exit 0
fi

# Create the guide
RESULT=$(curl -s -X POST http://localhost:3001/api/guides \
  -H 'Content-Type: application/json' \
  -H "Authorization: JWT $TOKEN" \
  -d '{
    "title": "True Digivice Guide",
    "slug": "true-digivice",
    "summary": "Complete crafting guide for all 11 True Digivice types in Digimon Masters Online. Materials, locations, costs, and resetting guide.",
    "tags": [{"tag":"Equipment"},{"tag":"Crafting"},{"tag":"Tokyo-Odaiba"}],
    "published": true,
    "content": [{"children":[{"text":"This guide is rendered via a custom page component. Edit metadata (title, summary, tags, published) here in the CMS."}]}]
  }')

echo "Result: $RESULT"
