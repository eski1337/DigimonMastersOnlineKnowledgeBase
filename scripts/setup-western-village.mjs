#!/usr/bin/env node
/**
 * Sets up Western Village map in the CMS:
 * 1. Uploads map image + world map image
 * 2. Creates or updates the map entry with all wiki data
 * 3. Uploads and links NPC icons
 * 4. Uploads and links Wild Digimon icons
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
const BASE = '/tmp/western-village-icons';

let TOKEN = '';

async function login() {
  const res = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  TOKEN = data.token;
  console.log('Logged in');
}

async function uploadImage(filePath, altText) {
  if (!existsSync(filePath)) {
    console.error(`  File not found: ${filePath}`);
    return null;
  }
  const fileData = readFileSync(filePath);
  const fileName = path.basename(filePath);
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const preFile = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="alt"\r\n\r\n${altText}\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
    'utf-8'
  );
  const postFile = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  const body = Buffer.concat([preFile, fileData, postFile]);

  const res = await fetch(`${CMS}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${TOKEN}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`  Upload failed: ${fileName} ${res.status} ${txt.slice(0, 200)}`);
    return null;
  }
  const data = await res.json();
  console.log(`  Uploaded: ${fileName} -> id=${data.doc?.id}`);
  return data.doc?.id || null;
}

async function getMapBySlug(slug) {
  const res = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&limit=1&depth=2`, {
    headers: { Authorization: `JWT ${TOKEN}` },
  });
  const data = await res.json();
  return data.docs?.[0] || null;
}

async function createMap(payload) {
  const res = await fetch(`${CMS}/api/maps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${TOKEN}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('  Create failed:', JSON.stringify(data).slice(0, 500));
    return null;
  }
  return data.doc;
}

async function updateMap(id, payload) {
  const res = await fetch(`${CMS}/api/maps/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${TOKEN}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`  Update failed: ${res.status} ${txt.slice(0, 300)}`);
  }
  return res.ok;
}

async function main() {
  await login();

  // Step 1: Upload map images
  console.log('\n=== Uploading map images ===');
  const mapImageId = await uploadImage(`${BASE}/Western_Village.png`, 'Western Village map');
  const worldMapId = await uploadImage(`${BASE}/Digital_World_-_Western_Area.png`, 'Digital World - Western Area');

  // Step 2: Check if map exists
  console.log('\n=== Checking for existing map ===');
  let map = await getMapBySlug('western-village');

  // Wild Digimon data (without icons yet - will add after)
  const wildDigimon = [
    { name: 'Mushroomon', level: '11-15', element: 'Wood', attribute: 'Virus' },
    { name: 'Woodmon', level: '11-15', element: 'Wood', attribute: 'Virus' },
    { name: 'Armadillomon', level: '12-16', element: 'Land', attribute: 'Vaccine' },
    { name: 'Candlemon', level: '12-16', element: 'Fire', attribute: 'Data' },
    { name: 'Togemon', level: '12-16', element: 'Wood', attribute: 'Data' },
    { name: 'Renamon', level: '16-18', element: 'Wind', attribute: 'Data' },
    { name: 'Digmon', level: '13-17', element: 'Land', attribute: 'Vaccine' },
    { name: 'Impmon', level: '13-17', element: 'Pitch Black', attribute: 'Virus' },
  ];

  // NPC data (without icons yet)
  const npcs = [
    { name: 'MudFrigimon', role: 'Item Seller' },
    { name: 'MudFrigimon', role: 'Kind' },
    { name: 'MudFrigimon', role: 'Young' },
    { name: 'Starmon of Passion', role: 'Western Station Manager' },
    { name: 'Pawnchessmon W', role: 'DATS Member' },
    { name: 'Pawnchessmon B', role: 'Warehouse' },
    { name: 'Akihiro Kurata', role: 'Doctor' },
    { name: 'Devil Impmon', role: 'Bad boy of Digital World' },
    { name: 'Cerberumon of Hell', role: 'Gatekeeper' },
    { name: 'Kamemon', role: 'Equipment Merge' },
    { name: 'DigimonArchive', role: 'DATS' },
  ];

  // Portal connections
  const portals = [
    { destination: 'Western Area: Outskirts', destinationSlug: 'western-area-outskirts' },
    { destination: 'D-Terminal', destinationSlug: 'd-terminal' },
    { destination: 'Western Area: West', destinationSlug: 'western-area-west' },
  ];

  const mapPayload = {
    name: 'Western Village',
    slug: 'western-village',
    world: 'digital-world',
    area: 'western-area',
    region: 'Western Area',
    mapType: 'field',
    levelRange: '11-18',
    description: 'A strategically important point where the Real World and the Digital World meet. Its security is threatened by the rampaging Digimon.',
    notes: [
      { type: 'p', children: [{ text: 'This area is one of the few areas with "spawnable" bosses. Digmon (Undersurface Coward) requires you to defeat around 15-20 Digmons (NOT Leaders) and an additional 10 Digmons to spawn two.' }] },
      { type: 'p', children: [{ text: 'They always drop Monster Card 2, so they are useful for farming Evolvers.' }] },
    ],
    published: true,
    wildDigimon,
    npcs,
    portals,
    ...(mapImageId ? { mapImage: mapImageId } : {}),
    ...(worldMapId ? { image: worldMapId } : {}),
  };

  if (map) {
    console.log(`  Map exists: id=${map.id}, updating...`);
    const ok = await updateMap(map.id, mapPayload);
    console.log(ok ? '  ✅ Map updated' : '  ❌ Map update failed');
    // Re-fetch to get updated data
    map = await getMapBySlug('western-village');
  } else {
    console.log('  Map not found, creating...');
    map = await createMap(mapPayload);
    if (map) {
      console.log(`  ✅ Map created: id=${map.id}`);
    } else {
      console.error('  ❌ Failed to create map');
      return;
    }
  }

  // Step 3: Upload NPC icons and link them
  console.log('\n=== Uploading NPC icons ===');
  const npcIconMap = {
    'MudFrigimon': 'MudFrigimon_Icon.png',
    'Starmon of Passion': 'Starmon_of_Passion_Icon.png',
    'Pawnchessmon W': 'PawnChessmon_W_Icon.png',
    'Pawnchessmon B': 'PawnChessmon_B_Icon.png',
    'Akihiro Kurata': 'Akihiro_Kurata_Icon.png',
    'Devil Impmon': 'Impmon_NPC_Icon.png',
    'Cerberumon of Hell': 'Cerberumon_NPC_Icon.png',
    'Kamemon': 'Kamemon_Eq_Merge_Icon.png',
    'DigimonArchive': 'DigimonArchive_Icon.png',
  };

  // Upload all unique NPC icon files first
  const npcIconIds = {};
  const uploadedFiles = {};
  for (const [npcName, fileName] of Object.entries(npcIconMap)) {
    if (!uploadedFiles[fileName]) {
      const iconId = await uploadImage(`${BASE}/${fileName}`, `${npcName} icon`);
      uploadedFiles[fileName] = iconId;
    }
    npcIconIds[npcName] = uploadedFiles[fileName];
  }

  // Build updated NPCs with icons
  const updatedNpcs = (map.npcs || npcs).map(npc => {
    const iconId = npcIconIds[npc.name];
    const existingIconId = typeof npc.icon === 'object' && npc.icon ? npc.icon.id : npc.icon;
    return {
      name: npc.name,
      role: npc.role || '',
      icon: iconId || existingIconId || null,
    };
  });

  // Step 4: Upload Wild Digimon icons and link them
  console.log('\n=== Uploading Wild Digimon icons ===');
  const digimonIconMap = {
    'Mushroomon': 'Mushroomon_Search_Icon.png',
    'Woodmon': 'Woodmon_Search_Icon.png',
    'Armadillomon': 'Armadillomon_Search_Icon.png',
    'Candlemon': 'Candlemon_Search_Icon.png',
    'Togemon': 'Togemon_Search_Icon.png',
    'Renamon': 'Renamon_Search_Icon.png',
    'Digmon': 'Digmon_Search_Icon.png',
    'Impmon': 'Impmon_Search_Icon.png',
  };

  const updatedDigimon = (map.wildDigimon || wildDigimon).map(d => {
    const fileName = digimonIconMap[d.name];
    return {
      name: d.name,
      level: d.level || '',
      element: d.element || '',
      attribute: d.attribute || '',
      _iconFile: fileName || null,
    };
  });

  // Upload digimon icons
  for (let i = 0; i < updatedDigimon.length; i++) {
    const d = updatedDigimon[i];
    if (d._iconFile) {
      const iconId = await uploadImage(`${BASE}/${d._iconFile}`, `${d.name} icon`);
      d.icon = iconId || null;
    } else {
      const existingIconId = typeof (map.wildDigimon?.[i]?.icon) === 'object' && map.wildDigimon?.[i]?.icon
        ? map.wildDigimon[i].icon.id : map.wildDigimon?.[i]?.icon;
      d.icon = existingIconId || null;
    }
    delete d._iconFile;
  }

  // Step 5: Final update with all icons
  console.log('\n=== Final update with icons ===');
  const ok = await updateMap(map.id, {
    npcs: updatedNpcs,
    wildDigimon: updatedDigimon,
  });
  console.log(ok ? '✅ Western Village fully set up!' : '❌ Final update failed');
}

main().catch(console.error);
