#!/usr/bin/env node
/**
 * Sets up Western Area maps using ONLY provided wiki data + icon files.
 * - Digimon Farm: full data from wiki HTML
 * - Other 5 maps: names/icons from folder files, no made-up stats
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
const BASE = '/tmp/western-area-icons';
let TOKEN = '';
let WORLD_MAP_ID = null;

async function login() {
  const r = await fetch(`${CMS}/api/users/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:EMAIL,password:PASSWORD}) });
  TOKEN = (await r.json()).token; console.log('Logged in');
}

async function upload(filePath, alt) {
  if (!existsSync(filePath)) { console.error(`  Missing: ${filePath}`); return null; }
  const fd = readFileSync(filePath), fn = path.basename(filePath);
  const b = '----FB' + Math.random().toString(36).slice(2);
  const pre = Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="alt"\r\n\r\n${alt}\r\n--${b}\r\nContent-Disposition: form-data; name="file"; filename="${fn}"\r\nContent-Type: image/png\r\n\r\n`,'utf-8');
  const post = Buffer.from(`\r\n--${b}--\r\n`,'utf-8');
  const r = await fetch(`${CMS}/api/media`, { method:'POST', headers:{Authorization:`JWT ${TOKEN}`,'Content-Type':`multipart/form-data; boundary=${b}`}, body:Buffer.concat([pre,fd,post]) });
  if (!r.ok) { console.error(`  Upload fail: ${fn} ${r.status}`); return null; }
  const d = await r.json(); return d.doc?.id || null;
}

async function getMap(slug) {
  const r = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&limit=1&depth=2`, { headers:{Authorization:`JWT ${TOKEN}`} });
  return (await r.json()).docs?.[0] || null;
}

async function upsert(slug, payload) {
  const ex = await getMap(slug);
  if (ex) {
    const r = await fetch(`${CMS}/api/maps/${ex.id}`, { method:'PATCH', headers:{'Content-Type':'application/json',Authorization:`JWT ${TOKEN}`}, body:JSON.stringify(payload) });
    if (!r.ok) { const t=await r.text(); console.error(`  Update fail: ${t.slice(0,300)}`); return ex; }
    console.log(`  Updated ${slug}`); return await getMap(slug);
  }
  const r = await fetch(`${CMS}/api/maps`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`JWT ${TOKEN}`}, body:JSON.stringify(payload) });
  const d = await r.json();
  if (!r.ok) { console.error(`  Create fail: ${JSON.stringify(d).slice(0,300)}`); return null; }
  console.log(`  Created ${slug} id=${d.doc?.id}`); return d.doc;
}

async function patchMap(id, payload) {
  const r = await fetch(`${CMS}/api/maps/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json',Authorization:`JWT ${TOKEN}`}, body:JSON.stringify(payload) });
  return r.ok;
}

// ─── DIGIMON FARM — Full wiki data provided ────────────────────────
const DIGIMON_FARM = {
  folder: 'Digimon Farm',
  img: 'Digimon_Farm.png',
  d: {
    name: 'Digimon Farm', slug: 'digimon-farm',
    world: 'digital-world', area: 'western-area', region: 'Western Area',
    mapType: 'field', levelRange: '26-34',
    description: 'It used to be a peaceful area, now it became chaos due to the rampaging Digimon.',
    published: true,
  },
  portals: [
    { destination: 'Wilderness Area', destinationSlug: 'wilderness-area' },
    { destination: 'Ruined Historic', destinationSlug: 'ruined-historic' },
  ],
  wd: [
    { name: 'Strikedramon', level: '26-28', element: 'Fire', attribute: 'Vaccine' },
    { name: 'Cerberumon', level: '28-32', element: 'Pitch Black', attribute: 'Vaccine' },
    { name: 'Blossomon', level: '29-33', element: 'Wood', attribute: 'Data' },
    { name: 'Leomon', level: '30-32', element: 'Fire', attribute: 'Vaccine' },
    { name: 'Monzaemon', level: '30-34', element: 'Pitch Black', attribute: 'Vaccine' },
    { name: 'WaruMonzaemon', level: '30-34', element: 'Pitch Black', attribute: 'Virus' },
    { name: 'Gatomon', level: '30-34', element: 'Light', attribute: 'Vaccine' },
    { name: 'Kyubimon', level: '32-34', element: 'Fire', attribute: 'Data' },
  ],
  di: {
    Strikedramon: 'Strikedramon_Search_Icon.png',
    Cerberumon: 'Cerberumon_Search_Icon.png',
    Blossomon: 'Blossomon_Search_Icon.png',
    Leomon: 'Leomon_Search_Icon.png',
    Monzaemon: 'Monzaemon_Search_Icon.png',
    WaruMonzaemon: 'WaruMonzaemon_Search_Icon.png',
    Gatomon: 'Gatomon_Search_Icon.png',
    Kyubimon: 'Kyubimon_Search_Icon.png',
  },
  npcs: [
    { name: 'MudFrigimon', role: 'Roaming Merchant' },
    { name: 'MudFrigimon', role: 'Young' },
    { name: 'MudFrigimon', role: 'Kind' },
    { name: 'MudFrigimon', role: 'Angry' },
    { name: 'Starmon of Passion', role: 'Western Station Manager' },
    { name: 'SuperStarmon', role: 'Fourth Dimension' },
    { name: 'Pawnchessmon W', role: 'DATS Member' },
    { name: 'Akihiro Kurata', role: 'Uncomfortable Doctor' },
    { name: 'Wanted Deputymon', role: 'Wanted Criminal' },
    { name: 'DigimonArchive', role: 'DATS' },
  ],
  ni: {
    MudFrigimon: 'MudFrigimon_Icon.png',
    'Starmon of Passion': 'Starmon_of_Passion_Icon.png',
    SuperStarmon: 'Superstarmon_(NPC)_Icon.png',
    'Pawnchessmon W': 'PawnChessmon_W_Icon.png',
    'Akihiro Kurata': 'Akihiro_Kurata_Icon.png',
    'Wanted Deputymon': 'Deputymon_Search_Icon.png',
    DigimonArchive: 'DigimonArchive_Icon.png',
  },
};

// ─── Other 5 maps — icons only, no made-up stats ──────────────────
// Names derived from icon filenames in each folder

const SKELETON_MAPS = [
  {
    folder: 'Western Area Outskirts', img: 'Western_Area_Outskirts.png',
    d: { name: 'Western Area: Outskirts', slug: 'western-area-outskirts', world: 'digital-world', area: 'western-area', region: 'Western Area', mapType: 'field', published: true },
    portals: [],
    digimonFiles: ['Flymon_Search_Icon.png','Kiwimon_Search_Icon.png','RedVegiemon_Search_Icon.png','Dokugumon_Search_Icon.png','Birdramon_Search_Icon.png','Leomon_Search_Icon.png','Strikedramon_Search_Icon.png','Renamon_Search_Icon.png'],
    npcFiles: { MudFrigimon:'MudFrigimon_Icon.png', 'Starmon of Passion':'Starmon_of_Passion_Icon.png', 'Pawnchessmon W':'PawnChessmon_W_Icon.png', 'Akihiro Kurata':'Akihiro_Kurata_Icon.png', 'Devil Impmon':'Impmon_NPC_Icon.png' },
  },
  {
    folder: 'Western Area East', img: 'Western_Area_East.png',
    d: { name: 'Western Area: East', slug: 'western-area-east', world: 'digital-world', area: 'western-area', region: 'Western Area', mapType: 'field', published: true },
    portals: [],
    digimonFiles: ['Patamon_Search_Icon.png','Dobermon_Search_Icon.png','Rockmon_Search_Icon.png','Greymon_Search_Icon.png','Strikedramon_Search_Icon.png','Leomon_Search_Icon.png','Renamon_Search_Icon.png'],
    npcFiles: { MudFrigimon:'MudFrigimon_Icon.png', 'Starmon of Passion':'Starmon_of_Passion_Icon.png', 'Pawnchessmon W':'PawnChessmon_W_Icon.png', 'Akihiro Kurata':'Akihiro_Kurata_Icon.png', 'Devil Impmon':'Impmon_NPC_Icon.png', 'Wanted Deputymon':'Deputymon_Search_Icon.png' },
  },
  {
    folder: 'Wilderness Area', img: 'Wilderness_Area.png',
    d: { name: 'Wilderness Area', slug: 'wilderness-area', world: 'digital-world', area: 'western-area', region: 'Western Area', mapType: 'field', published: true },
    portals: [],
    digimonFiles: ['Goblimon_Search_Icon.png','Biyomon_Search_Icon.png','Boarmon_Search_Icon.png','Stingmon_Search_Icon.png','Sabirdramon_Search_Icon.png','Devimon_Search_Icon.png','Renamon_Search_Icon.png'],
    npcFiles: { MudFrigimon:'MudFrigimon_Icon.png', 'Homer Yushima':'Homer_Yushima_Icon.png', 'Akihiro Kurata':'Akihiro_Kurata_Icon.png', 'Pawnchessmon B':'PawnChessmon_B_Icon.png' },
  },
  {
    folder: 'Wind Valley', img: 'Wind_Valley.png',
    d: { name: 'Wind Valley', slug: 'wind-valley', world: 'digital-world', area: 'western-area', region: 'Western Area', mapType: 'field', published: true },
    portals: [],
    digimonFiles: ['Doggymon_Search_Icon.png','Wizardmon_Search_Icon.png','Gladimon_Search_Icon.png','SealsDramon_Search_Icon.png','Garurumon_Search_Icon.png','IceDevimon_Search_Icon.png','Kyubimon_Search_Icon.png','Leomon_Search_Icon.png'],
    npcFiles: { Frigimon:'Frigimon_Icon.png', 'Akihiro Kurata':'Akihiro_Kurata_Icon.png', DigimonArchive:'DigimonArchive_Icon.png', 'Pawnchessmon B':'PawnChessmon_B_Icon.png', 'Pawnchessmon W':'PawnChessmon_W_Icon.png' },
  },
  {
    folder: 'Ruined Historic', img: 'Ruined_Historic.png',
    d: { name: 'Ruined Historic', slug: 'ruined-historic', world: 'digital-world', area: 'western-area', region: 'Western Area', mapType: 'field', published: true },
    portals: [],
    digimonFiles: ['Aquilamon_Search_Icon.png','Garudamon_Search_Icon.png','Kyubimon_Search_Icon.png','MetalGreymon_Search_Icon.png','Megadramon_Search_Icon.png','Panjyamon_Search_Icon.png','Leomon_Search_Icon.png'],
    npcFiles: { MudFrigimon:'MudFrigimon_Icon.png', 'Homer Yushima':'Homer_Yushima_Icon.png', 'Akihiro Kurata':'Akihiro_Kurata_Icon.png', Hawkmon:'Hawkmon_NPC_Icon.png', Kamemon:'Kamemon_(NPC)_Icon.png', SuperStarmon:'Superstarmon_(NPC)_Icon.png' },
  },
];

// Helper: extract digimon name from icon filename like "Strikedramon_Search_Icon.png" -> "Strikedramon"
function nameFromFile(f) {
  return f.replace('_Search_Icon.png', '').replace(/_/g, ' ');
  // Special cases handled: most names don't have underscores in the actual name
}

// Fix names that have underscores as part of the name
function fixDigimonName(f) {
  const raw = f.replace('_Search_Icon.png', '');
  // Known multi-word names
  const known = {
    'RedVegiemon': 'RedVegiemon',
    'IceDevimon': 'IceDevimon',
    'MetalGreymon': 'MetalGreymon',
    'SealsDramon': 'SealsDramon',
    'WaruMonzaemon': 'WaruMonzaemon',
  };
  return known[raw] || raw;
}

// ─── Process Digimon Farm (full data) ─────────────────────────────
async function processFullMap(m) {
  console.log(`\n${'='.repeat(50)}\n=== ${m.d.name} ===\n${'='.repeat(50)}`);
  const mapImgId = await upload(`${BASE}/${m.folder}/${m.img}`, `${m.d.name} map`);
  if (!WORLD_MAP_ID) {
    const p = `${BASE}/Western Village/Digital_World_-_Western_Area.png`;
    if (existsSync(p)) WORLD_MAP_ID = await upload(p, 'Digital World - Western Area');
  }
  const payload = { ...m.d, portals: m.portals, wildDigimon: m.wd, npcs: m.npcs,
    ...(mapImgId ? { mapImage: mapImgId } : {}),
    ...(WORLD_MAP_ID ? { image: WORLD_MAP_ID } : {}),
  };
  const map = await upsert(m.d.slug, payload);
  if (!map) return;

  // Upload NPC icons
  console.log('  NPC icons...');
  const npcCache = {};
  const updNpcs = [];
  for (const npc of m.npcs) {
    const f = m.ni[npc.name];
    let id = null;
    if (f) { if (!npcCache[f]) npcCache[f] = await upload(`${BASE}/${m.folder}/${f}`, `${npc.name} icon`); id = npcCache[f]; }
    updNpcs.push({ name: npc.name, role: npc.role, icon: id || null });
  }

  // Upload Digimon icons
  console.log('  Digimon icons...');
  const updDigi = [];
  for (const d of m.wd) {
    const f = m.di[d.name];
    const id = f ? await upload(`${BASE}/${m.folder}/${f}`, `${d.name} icon`) : null;
    updDigi.push({ name: d.name, level: d.level, element: d.element, attribute: d.attribute, icon: id || null });
  }

  const ok = await patchMap(map.id, { npcs: updNpcs, wildDigimon: updDigi });
  console.log(ok ? `  ✅ ${m.d.name} done!` : `  ❌ icon update failed`);
}

// ─── Process skeleton maps (icons only, no stats) ─────────────────
async function processSkeletonMap(m) {
  console.log(`\n${'='.repeat(50)}\n=== ${m.d.name} (skeleton) ===\n${'='.repeat(50)}`);
  const mapImgId = await upload(`${BASE}/${m.folder}/${m.img}`, `${m.d.name} map`);
  if (!WORLD_MAP_ID) {
    const p = `${BASE}/Western Village/Digital_World_-_Western_Area.png`;
    if (existsSync(p)) WORLD_MAP_ID = await upload(p, 'Digital World - Western Area');
  }

  // Build wild digimon entries from filenames (name + icon only)
  const wdEntries = m.digimonFiles.map(f => ({ name: fixDigimonName(f), level: '', element: '', attribute: '' }));
  // Build NPC entries from provided names
  const npcEntries = Object.keys(m.npcFiles).map(name => ({ name, role: '' }));

  const payload = { ...m.d, portals: m.portals, wildDigimon: wdEntries, npcs: npcEntries,
    ...(mapImgId ? { mapImage: mapImgId } : {}),
    ...(WORLD_MAP_ID ? { image: WORLD_MAP_ID } : {}),
  };
  const map = await upsert(m.d.slug, payload);
  if (!map) return;

  // Upload NPC icons
  console.log('  NPC icons...');
  const npcCache = {};
  const updNpcs = [];
  for (const [name, file] of Object.entries(m.npcFiles)) {
    if (!npcCache[file]) npcCache[file] = await upload(`${BASE}/${m.folder}/${file}`, `${name} icon`);
    updNpcs.push({ name, role: '', icon: npcCache[file] || null });
  }

  // Upload Digimon icons
  console.log('  Digimon icons...');
  const updDigi = [];
  for (const f of m.digimonFiles) {
    const name = fixDigimonName(f);
    const id = await upload(`${BASE}/${m.folder}/${f}`, `${name} icon`);
    updDigi.push({ name, level: '', element: '', attribute: '', icon: id || null });
  }

  const ok = await patchMap(map.id, { npcs: updNpcs, wildDigimon: updDigi });
  console.log(ok ? `  ✅ ${m.d.name} done!` : `  ❌ icon update failed`);
}

async function main() {
  await login();
  // 1. Digimon Farm (full wiki data)
  await processFullMap(DIGIMON_FARM);
  // 2. Skeleton maps (icons + names only)
  for (const m of SKELETON_MAPS) await processSkeletonMap(m);
  console.log('\n🎉 All Western Area maps set up!');
}
main().catch(console.error);
