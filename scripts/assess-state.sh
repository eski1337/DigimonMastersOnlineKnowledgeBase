#!/bin/bash
echo "=== Current State Assessment ==="

TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

echo "--- Digimon count ---"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Total Digimon:', d.get('totalDocs',0))
" 2>/dev/null

echo ""
echo "--- Media count ---"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/media?limit=1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Total Media:', d.get('totalDocs',0))
" 2>/dev/null

echo ""
echo "--- Sample Digimon with images ---"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=5&sort=name&depth=1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for doc in d.get('docs',[]):
    icon = doc.get('icon')
    main = doc.get('mainImage')
    icon_url = icon.get('url','') if isinstance(icon, dict) else (icon or '')
    main_url = main.get('url','') if isinstance(main, dict) else (main or '')
    has_skills = len(doc.get('skills',[])) > 0
    has_stats = any(v > 0 for v in doc.get('stats',{}).values()) if doc.get('stats') else False
    print(f'{doc[\"name\"]:30s} icon={bool(icon_url):5} main={bool(main_url):5} skills={has_skills:5} stats={has_stats:5}')
" 2>/dev/null

echo ""
echo "--- Digimon with icon images ---"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1&where[icon][exists]=true&depth=0" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Digimon WITH icon:', d.get('totalDocs',0))
" 2>/dev/null

curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1&where[mainImage][exists]=true&depth=0" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Digimon WITH mainImage:', d.get('totalDocs',0))
" 2>/dev/null

echo ""
echo "--- Media files with digimon references ---"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/media?limit=5&where[belongsTo.digimon][exists]=true&sort=-createdAt" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Media with digimon ref:', d.get('totalDocs',0))
for doc in d.get('docs',[])[:5]:
    bt = doc.get('belongsTo',{})
    print(f'  {doc.get(\"filename\",\"?\"):40s} -> {bt.get(\"digimon\",\"?\")} type={doc.get(\"imageType\",\"?\")}')
" 2>/dev/null

echo ""
echo "--- Digimon with skills and stats ---"
python3 << 'PYEOF'
import json, urllib.request

token = open('/dev/stdin','r').read().strip() if False else ''
# Re-login
import urllib.parse
data = json.dumps({"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}).encode()
req = urllib.request.Request('http://localhost:3001/api/users/login', data=data, headers={'Content-Type':'application/json'}, method='POST')
resp = urllib.request.urlopen(req)
token = json.loads(resp.read()).get('token','')

with_skills = 0
with_stats = 0
with_intro = 0
total = 0
page = 1
while True:
    req = urllib.request.Request(
        f'http://localhost:3001/api/digimon?limit=100&page={page}&depth=0',
        headers={'Authorization': f'JWT {token}'}
    )
    resp = urllib.request.urlopen(req)
    d = json.loads(resp.read())
    for doc in d.get('docs',[]):
        total += 1
        if doc.get('skills') and len(doc['skills']) > 0:
            with_skills += 1
        if doc.get('stats') and any(v > 0 for v in doc['stats'].values()):
            with_stats += 1
        if doc.get('introduction'):
            with_intro += 1
    if not d.get('hasNextPage'):
        break
    page += 1

print(f'Total: {total}')
print(f'With skills: {with_skills}')
print(f'With stats: {with_stats}')
print(f'With introduction: {with_intro}')
PYEOF

echo ""
echo "--- User role check ---"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/users?limit=10" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for u in d.get('docs',[]):
    print(f'  {u.get(\"email\",\"?\"):30s} role={u.get(\"role\",\"?\")} verified={u.get(\"_verified\",\"?\")}')
" 2>/dev/null

echo ""
echo "=== Done ==="
