#!/bin/bash
echo "=== Import Missing Digimon ==="

# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"eski@dmokb.info","password":"EskiDMOKB2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

echo "Token: $(echo $TOKEN | head -c 20)..."

# Get all existing slugs
echo "Fetching existing slugs..."
EXISTING=$(python3 << 'PYEOF'
import json, urllib.request
token = open('/dev/stdin').read().strip()
slugs = set()
page = 1
while True:
    req = urllib.request.Request(
        f'http://localhost:3001/api/digimon?limit=100&page={page}&depth=0',
        headers={'Authorization': f'JWT {token}'}
    )
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    for doc in data.get('docs', []):
        slugs.add(doc.get('slug', ''))
    if not data.get('hasNextPage'):
        break
    page += 1
print(json.dumps(list(slugs)))
PYEOF
<<< "$TOKEN")

echo "Existing count: $(echo $EXISTING | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))')"

# Now use node to parse MD and find missing, then create them one by one
node << 'NODEEOF'
const fs = require('fs');
const http = require('http');

const token = process.env.TOKEN;
const existing = new Set(JSON.parse(process.env.EXISTING));

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3001, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        'Authorization': 'JWT ' + token,
      },
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  // Quick check: what slugs are missing?
  const scriptDir = __dirname || '/home/deploy/app/scripts';
  const files = ['Data-Digimon-A-Z.md','Vaccine-Digimon-A-M.md','Vaccine-Digimon-N-Z.md','Virus-Digimon-A-Z.md','Unknown-Type-Digimon.md'];
  
  const allNames = [];
  for (const f of files) {
    const text = fs.readFileSync('/home/deploy/app/scripts/' + f, 'utf-8');
    const entries = text.split(/={10,}/);
    for (const entry of entries) {
      const lines = entry.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 5) continue;
      const name = lines[0].replace(/\s*\(.*$/, '').trim();
      if (!name || name.length > 100) continue;
      const slug = name.toLowerCase().replace(/[()]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');
      if (!existing.has(slug)) {
        allNames.push({ name, slug });
      }
    }
  }
  
  console.log('Missing Digimon:', allNames.length);
  for (const d of allNames) {
    console.log('  -', d.name, '(' + d.slug + ')');
  }
  
  // Create missing ones with 3s delay
  for (const d of allNames) {
    await new Promise(r => setTimeout(r, 3000));
    const payload = { name: d.name, slug: d.slug, form: 'Unknown', attribute: 'None', element: 'Neutral', published: true };
    const res = await req('POST', '/api/digimon', payload);
    if ((res.status === 200 || res.status === 201) && res.body.doc) {
      console.log('  Created:', d.name, '->', res.body.doc.id);
    } else {
      console.log('  FAILED:', d.name, JSON.stringify(res.body).substring(0, 100));
    }
  }
}

main().catch(e => console.error(e));
NODEEOF

echo ""
echo "=== Final count ==="
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Total Digimon in DB: {d.get(\"totalDocs\",0)}')
" 2>/dev/null
