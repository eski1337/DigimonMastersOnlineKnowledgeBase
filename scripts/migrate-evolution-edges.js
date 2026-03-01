/**
 * Migration Script: Populate evolution-edges + evolution-lines from existing Digimon data.
 *
 * Uses the CMS HTTP API (no Payload import needed).
 * Must be run while the CMS is running.
 *
 * Run on VPS:  node scripts/migrate-evolution-edges.js
 * Optional:    CMS_URL=http://localhost:3001 node scripts/migrate-evolution-edges.js
 */

const CMS = process.env.CMS_URL || 'http://localhost:3001';
const LOGIN_EMAIL = process.env.CMS_EMAIL || process.env.ADMIN_EMAIL || '';
const LOGIN_PASSWORD = process.env.CMS_PASSWORD || process.env.ADMIN_PASSWORD || '';

let TOKEN = '';

/* ── HTTP helpers ─────────────────────────────────────────────────────── */

async function api(method, path, body) {
  const url = `${CMS}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (TOKEN) opts.headers['Authorization'] = `JWT ${TOKEN}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} => ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function login() {
  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
    console.error('ERROR: Set CMS_EMAIL and CMS_PASSWORD env vars (admin account)');
    process.exit(1);
  }
  console.log(`Logging in as ${LOGIN_EMAIL}...`);
  const res = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
  });
  if (!res.ok) {
    console.error(`Login failed: ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  TOKEN = data.token;
  console.log(`  Logged in as ${data.user?.username || data.user?.email} (role: ${data.user?.role})\n`);
}

async function findAll(collection, depth = 1) {
  const all = [];
  let page = 1;
  while (true) {
    const data = await api('GET', `/api/${collection}?limit=100&page=${page}&depth=${depth}`);
    all.push(...data.docs);
    if (!data.hasNextPage) break;
    page++;
  }
  return all;
}

/* ── Main ─────────────────────────────────────────────────────────────── */

async function run() {
  console.log('=== Evolution Edges + Lines Migration ===');
  console.log(`CMS: ${CMS}\n`);

  // 0. Authenticate
  await login();

  // 1. Load all Digimon
  console.log('Loading all Digimon...');
  const allDigimon = await findAll('digimon', 1);
  console.log(`  Loaded ${allDigimon.length} Digimon\n`);

  // 2. Build lookup maps
  const nameToDoc = new Map();
  for (const d of allDigimon) {
    nameToDoc.set(d.name, d);
  }

  // 3. Load existing edges to skip duplicates
  const existingEdgeDocs = await findAll('evolution-edges', 0);
  console.log(`  Existing edges: ${existingEdgeDocs.length}`);
  const existingEdgeKeys = new Set();
  for (const e of existingEdgeDocs) {
    const src = typeof e.source === 'string' ? e.source : e.source?.id;
    const tgt = typeof e.target === 'string' ? e.target : e.target?.id;
    if (src && tgt) existingEdgeKeys.add(`${src}->${tgt}`);
  }

  // 4. Create edges from digivolvesTo
  let edgesCreated = 0, edgesSkipped = 0, edgeErrors = 0;

  for (const digimon of allDigimon) {
    const digivolvesTo = digimon.digivolutions?.digivolvesTo || [];
    for (const evo of digivolvesTo) {
      if (!evo.name) continue;
      const target = nameToDoc.get(evo.name);
      if (!target) continue;

      const key = `${digimon.id}->${target.id}`;
      if (existingEdgeKeys.has(key)) { edgesSkipped++; continue; }

      // Detect type
      let evolutionType = 'normal';
      const jogress = digimon.digivolutions?.jogress || [];
      if (jogress.length > 0) {
        const isJ = jogress.some(j => j.resultName === evo.name || j.partnerName === evo.name);
        if (isJ) evolutionType = 'jogress';
      }
      if (evolutionType === 'normal') {
        if (target.name?.includes(' X') && !digimon.name?.includes(' X')) evolutionType = 'x-antibody';
        else if (target.form === 'Burst Mode') evolutionType = 'mode-change';
        else if (target.form === 'Armor') evolutionType = 'digi-egg';
      }

      // Jogress partner
      let jogressPartner = undefined;
      if (evolutionType === 'jogress') {
        for (const j of jogress) {
          if (j.resultName === evo.name && j.partnerName) {
            const p = nameToDoc.get(j.partnerName);
            if (p) { jogressPartner = p.id; break; }
          }
        }
      }

      const body = {
        source: digimon.id,
        target: target.id,
        evolutionType,
        requiredLevel: evo.requiredLevel || undefined,
        requiredItem: evo.requiredItem || undefined,
      };
      if (jogressPartner) body.jogressPartner = jogressPartner;

      try {
        await api('POST', '/api/evolution-edges', body);
        existingEdgeKeys.add(key);
        edgesCreated++;
        if (edgesCreated % 50 === 0) console.log(`  ... ${edgesCreated} edges created`);
      } catch (err) {
        edgeErrors++;
        console.error(`  EDGE ERROR ${digimon.name} -> ${evo.name}: ${err.message}`);
      }
    }
  }

  console.log(`\nEdges: created=${edgesCreated} skipped=${edgesSkipped} errors=${edgeErrors}\n`);

  // 5. Build evolution lines (root Digimon that have no digivolvesFrom)
  console.log('Building evolution lines...');

  const existingLines = await findAll('evolution-lines', 0);
  const existingLineNames = new Set(existingLines.map(l => l.name));
  console.log(`  Existing lines: ${existingLines.length}`);

  const visited = new Set();
  let linesCreated = 0, linesSkipped = 0;

  for (const d of allDigimon) {
    const hasFrom = (d.digivolutions?.digivolvesFrom || []).length > 0;
    const hasTo = (d.digivolutions?.digivolvesTo || []).length > 0;
    if (hasFrom || !hasTo || visited.has(d.slug)) continue;

    // Walk forward to collect the chain
    const chain = [];
    const queue = [d];
    const seen = new Set();
    while (queue.length > 0) {
      const cur = queue.shift();
      if (seen.has(cur.slug)) continue;
      seen.add(cur.slug);
      visited.add(cur.slug);
      chain.push(cur.id);
      for (const evo of (cur.digivolutions?.digivolvesTo || [])) {
        if (!evo.name) continue;
        const t = nameToDoc.get(evo.name);
        if (t && !seen.has(t.slug)) queue.push(t);
      }
    }

    if (chain.length < 2) continue;

    const lineName = `${d.name} Line`;
    if (existingLineNames.has(lineName)) { linesSkipped++; continue; }

    try {
      await api('POST', '/api/evolution-lines', {
        name: lineName,
        rootDigimon: d.id,
        digimonInLine: chain,
        isPublic: true,
      });
      linesCreated++;
      if (linesCreated % 20 === 0) console.log(`  ... ${linesCreated} lines created`);
    } catch (err) {
      console.error(`  LINE ERROR ${lineName}: ${err.message}`);
    }
  }

  console.log(`\nLines: created=${linesCreated} skipped=${linesSkipped}`);
  console.log('\n=== Migration Done ===');
}

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
