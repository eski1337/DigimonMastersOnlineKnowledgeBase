#!/bin/bash
echo "=== Find Missing Digimon ==="

TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

python3 << 'PYEOF'
import json, urllib.request

# Login
data = json.dumps({"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}).encode()
req = urllib.request.Request('http://localhost:3001/api/users/login', data=data, headers={'Content-Type':'application/json'}, method='POST')
resp = urllib.request.urlopen(req)
token = json.loads(resp.read()).get('token','')

# Get all existing Digimon names
existing = set()
page = 1
while True:
    req = urllib.request.Request(
        f'http://localhost:3001/api/digimon?limit=100&page={page}&depth=0',
        headers={'Authorization': f'JWT {token}'}
    )
    resp = urllib.request.urlopen(req)
    d = json.loads(resp.read())
    for doc in d.get('docs',[]):
        existing.add(doc['name'].lower())
    if not d.get('hasNextPage'):
        break
    page += 1

print(f'Existing Digimon: {len(existing)}')

# Get all media digimon names
media_names = set()
page = 1
while True:
    req = urllib.request.Request(
        f'http://localhost:3001/api/media?limit=100&page={page}&depth=0',
        headers={'Authorization': f'JWT {token}'}
    )
    resp = urllib.request.urlopen(req)
    d = json.loads(resp.read())
    for doc in d.get('docs',[]):
        name = doc.get('belongsTo',{}).get('digimon','')
        if name:
            media_names.add(name)
    if not d.get('hasNextPage'):
        break
    page += 1

print(f'Unique Digimon names in media: {len(media_names)}')

# Find media names not in existing
missing = []
for name in sorted(media_names):
    if name.lower() not in existing:
        missing.append(name)

print(f'\nDigimon with media but NOT in DB ({len(missing)}):')
for n in missing:
    print(f'  {n}')

# Also check digimon-names.json for names not in existing
try:
    names_file = json.load(open('/home/deploy/app/scripts/digimon-names.json'))
    names_missing = [n for n in names_file if n.lower() not in existing]
    print(f'\nDigimon in names file but NOT in DB ({len(names_missing)}):')
    for n in sorted(names_missing)[:30]:
        print(f'  {n}')
    if len(names_missing) > 30:
        print(f'  ... and {len(names_missing) - 30} more')
except:
    print('Could not read digimon-names.json')
PYEOF
