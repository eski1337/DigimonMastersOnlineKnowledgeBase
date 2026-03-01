#!/usr/bin/env node
/**
 * Adds portal connections to all Western Area maps.
 * Connections derived from the provided world map image areas in the wiki HTML.
 */
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
let TOKEN = '';

async function login() {
  const r = await fetch(`${CMS}/api/users/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:EMAIL,password:PASSWORD}) });
  TOKEN = (await r.json()).token; console.log('Logged in');
}

async function getMap(slug) {
  const r = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&limit=1&depth=0`, { headers:{Authorization:`JWT ${TOKEN}`} });
  return (await r.json()).docs?.[0] || null;
}

async function patchMap(id, payload) {
  const r = await fetch(`${CMS}/api/maps/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json',Authorization:`JWT ${TOKEN}`}, body:JSON.stringify(payload) });
  if (!r.ok) { const t = await r.text(); console.error(`  Fail: ${t.slice(0,200)}`); }
  return r.ok;
}

// Portal connections from the provided HTML world map image areas
const PORTAL_MAP = {
  'western-area-outskirts': [
    { destination: 'Western Village', destinationSlug: 'western-village' },
    { destination: 'Western Area: East', destinationSlug: 'western-area-east' },
  ],
  'western-area-east': [
    { destination: 'Western Area: Outskirts', destinationSlug: 'western-area-outskirts' },
    { destination: 'Wilderness Area', destinationSlug: 'wilderness-area' },
  ],
  'wilderness-area': [
    { destination: 'Western Area: East', destinationSlug: 'western-area-east' },
    { destination: 'Digimon Farm', destinationSlug: 'digimon-farm' },
  ],
  'wind-valley': [
    { destination: 'Digimon Farm', destinationSlug: 'digimon-farm' },
    { destination: 'Ruined Historic', destinationSlug: 'ruined-historic' },
  ],
  'ruined-historic': [
    { destination: 'Digimon Farm', destinationSlug: 'digimon-farm' },
    { destination: 'Wind Valley', destinationSlug: 'wind-valley' },
  ],
};

async function main() {
  await login();
  for (const [slug, portals] of Object.entries(PORTAL_MAP)) {
    const map = await getMap(slug);
    if (!map) { console.log(`  ${slug}: not found`); continue; }
    if (map.portals?.length > 0) { console.log(`  ${slug}: already has ${map.portals.length} portals, skipping`); continue; }
    const ok = await patchMap(map.id, { portals });
    console.log(`  ${slug}: ${ok ? '✅' : '❌'} ${portals.map(p=>p.destination).join(', ')}`);
  }
  console.log('Done!');
}
main().catch(console.error);
