#!/usr/bin/env node
/**
 * Map setup script for maps still missing full data on production:
 * - Dark Tower Wasteland, Western Area: West
 * - Digimon Maze Entrance, B1, B2, F1, F2, F3, F4
 *
 * Run on production via SSH:
 *   ssh deploy@212.227.103.86 "cd /home/deploy/app && CMS_ADMIN_EMAIL=<email> CMS_ADMIN_PASSWORD=<password> CMS_INTERNAL_URL=http://localhost:3001 node scripts/setup-all-maps.mjs 2>&1"
 *
 * Images must be SCP'd to the server first (see below).
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';

const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
// On server, images will be at /home/deploy/app/map-assets/<folder-name>/
const ASSETS_ROOT = process.env.MAP_ASSETS_ROOT || path.resolve('map-assets');

let TOKEN = '';

// ── Helpers ──────────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  TOKEN = data.token;
  console.log('✅ Logged in to CMS');
}

async function uploadImage(filePath, altText) {
  if (!existsSync(filePath)) {
    console.error(`  ⚠ File not found: ${filePath}`);
    return null;
  }
  const fileData = readFileSync(filePath);
  const fileName = path.basename(filePath);
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
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
    console.error(`  ✗ Upload failed: ${fileName} ${res.status} ${txt.slice(0, 200)}`);
    return null;
  }
  const data = await res.json();
  console.log(`  ↑ Uploaded: ${fileName} → id=${data.doc?.id}`);
  return data.doc?.id || null;
}

async function getMapBySlug(slug) {
  const res = await fetch(`${CMS}/api/maps?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=2`, {
    headers: { Authorization: `JWT ${TOKEN}` },
  });
  const data = await res.json();
  return data.docs?.[0] || null;
}

async function upsertMap(slug, payload) {
  const existing = await getMapBySlug(slug);
  if (existing) {
    console.log(`  Map "${payload.name}" exists (id=${existing.id}), updating…`);
    const res = await fetch(`${CMS}/api/maps/${existing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${TOKEN}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`  ✗ Update failed: ${res.status} ${txt.slice(0, 300)}`);
      return null;
    }
    console.log(`  ✅ Updated "${payload.name}"`);
    return existing.id;
  } else {
    console.log(`  Creating map "${payload.name}"…`);
    const res = await fetch(`${CMS}/api/maps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${TOKEN}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`  ✗ Create failed: ${JSON.stringify(data).slice(0, 500)}`);
      return null;
    }
    console.log(`  ✅ Created "${payload.name}" (id=${data.doc?.id})`);
    return data.doc?.id || null;
  }
}

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[:()\[\]]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Upload all icon files from a folder and return a map of filename → mediaId
async function uploadFolderIcons(folderPath, files) {
  const iconIds = {};
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const alt = file.replace(/_/g, ' ').replace(/\.png$/i, '');
    const id = await uploadImage(filePath, alt);
    if (id) iconIds[file] = id;
  }
  return iconIds;
}

// Classify files in a folder
function classifyFiles(folderPath) {
  if (!existsSync(folderPath)) return { mapImages: [], loadingScreens: [], searchIcons: [], npcIcons: [], otherImages: [], textFiles: [] };
  const files = readdirSync(folderPath);
  const result = { mapImages: [], loadingScreens: [], searchIcons: [], npcIcons: [], otherImages: [], textFiles: [] };
  for (const f of files) {
    if (f.endsWith('.txt')) { result.textFiles.push(f); continue; }
    if (!f.match(/\.(png|jpg|jpeg|webp)$/i)) continue;
    if (f.startsWith('Loading_') || f.includes('Load.png')) { result.loadingScreens.push(f); }
    else if (f.includes('_Search_Icon')) { result.searchIcons.push(f); }
    else if (f.includes('_Icon') || f.includes('NPC_Icon')) { result.npcIcons.push(f); }
    else if (f.match(/^(Aggressive|Defensive|Neutral|None|Vaccine|Virus|Data|Unknown_Attribute|Fire|Ice|Water|Wood|Wind|Land|Light|Pitch_Black|Thunder|Steel)\./i)) { result.otherImages.push(f); }
    else { result.mapImages.push(f); }
  }
  return result;
}

// ── Map Data Definitions ─────────────────────────────────────────────

const ALL_MAPS = [
  // ════════════════════════════════════════════════
  // Western Area: West (skeleton on prod)
  // ════════════════════════════════════════════════
  {
    name: 'Western Area: West',
    slug: 'western-area-west',
    world: 'digital-world',
    area: 'western-area',
    mapType: 'field',
    levelRange: '40-54',
    description: 'A very dangerous area because of rampaging digimon due to the Dark Towers.',
    folderPath: path.join(ASSETS_ROOT, 'Western Area West'),
    mapImageFile: 'Western_Area_West.png',
    loadingScreenFile: 'Loading_WesternAreaWest.png',
    sortOrder: 7,
    npcs: [
      { name: 'Akihiro Kurata', role: 'Uncomfortable Doctor', iconFile: 'Akihiro_Kurata_Icon.png' },
      { name: 'Wizard Pumpkinmon', role: 'Halloween', iconFile: 'Wizard_Pumpkinmon_Icon.png' },
    ],
    wildDigimon: [
      { name: 'SkullGreymon', level: '46-48', element: 'Pitch Black', attribute: 'Virus', iconFile: 'SkullGreymon_Search_Icon.png' },
      { name: 'MetalGreymon', level: '46-48', element: 'Fire', attribute: 'Vaccine', iconFile: 'MetalGreymon_Search_Icon.png' },
      { name: 'Okuwamon', level: '43-45', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Okuwamon_Search_Icon.png' },
      { name: 'Coredramon (Blue)', level: '43-45', element: 'Fire', attribute: 'Vaccine', iconFile: 'Coredramon_(Blue)_Search_Icon.png' },
      { name: 'Coredramon (Green)', level: '43-45', element: 'Fire', attribute: 'Virus', iconFile: 'Coredramon_(Green)_Search_Icon.png' },
      { name: 'Pumpkinmon', level: '40-42', element: 'Pitch Black', attribute: 'Data', iconFile: 'Pumpkinmon_Search_Icon.png' },
      { name: 'PileVolcamon', level: '49-51', element: 'Land', attribute: 'Data', iconFile: 'PileVolcamon_Search_Icon.png' },
      { name: 'Kyubimon', level: '47-49', element: 'Pitch Black', attribute: 'Data', iconFile: 'Kyubimon_Search_Icon.png' },
      { name: 'Falcomon', level: '43-47', element: 'Wind', attribute: 'Vaccine', iconFile: 'Falcomon_Search_Icon.png' },
      { name: 'Baihumon', level: 'Boss', element: 'Steel', attribute: 'Vaccine', iconFile: 'Baihumon_Search_Icon.png' },
    ],
    portals: [
      { destination: 'Western Village', destinationSlug: 'western-village' },
      { destination: 'Ruined Historic', destinationSlug: 'ruined-historic' },
      { destination: 'Dark Tower Wasteland', destinationSlug: 'dark-tower-wasteland' },
    ],
  },

  // ════════════════════════════════════════════════
  // Dark Tower Wasteland
  // ════════════════════════════════════════════════
  {
    name: 'Dark Tower Wasteland',
    slug: 'dark-tower-wasteland',
    world: 'digital-world',
    area: 'western-area',
    mapType: 'field',
    levelRange: '51-62',
    description: 'An area where the digivolution of digimon is restricted because of the several Dark Towers built by the evil Digimon Kaiser.',
    folderPath: path.join(ASSETS_ROOT, 'Dark Tower Wasteland'),
    mapImageFile: 'Dark_Tower_Wasteland.png',
    loadingScreenFile: 'Loading_DarkTower.png',
    sortOrder: 8,
    npcs: [
      { name: 'Homer Yushima', role: 'DATS Chief', iconFile: 'Homer_Yushima_Icon.png' },
      { name: 'Akihiro Kurata', role: 'Uncomfortable Doctor', iconFile: 'Akihiro_Kurata_Icon.png' },
      { name: 'Digimon Kaiser', role: "Kimeramon's Creator", iconFile: 'Digimon_Kaiser_Icon.png' },
      { name: 'Falcomon', role: "Keenan Krier's Friend", iconFile: 'FalcomonNPC_Icon.png' },
    ],
    wildDigimon: [
      { name: 'Veemon', level: '59-61', element: 'Light', attribute: 'Vaccine', iconFile: 'Veemon_Search_Icon.png' },
      { name: 'Wormmon', level: '51-53', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Wormmon_Search_Icon.png' },
      { name: 'Bakemon', level: '53-55', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Bakemon_Search_Icon.png' },
      { name: 'Kyubimon', level: '56-58', element: 'Pitch Black', attribute: 'Data', iconFile: 'Kyubimon_Search_Icon.png' },
      { name: 'Antylamon', level: '57-58', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Antylamon_Search_Icon.png' },
      { name: 'Puppetmon', level: '56-58', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Puppetmon_Search_Icon.png' },
      { name: 'SkullMeramon', level: '55-57', element: 'Fire', attribute: 'Data', iconFile: 'SkullMeramon_Search_Icon.png' },
      { name: 'GrandKuwagamon', level: '56-58', element: 'Pitch Black', attribute: 'Virus', iconFile: 'GrandKuwagamon_Search_Icon.png' },
      { name: 'BlackWarGreymon', level: 'Boss', element: 'Fire', attribute: 'Virus', iconFile: 'BlackWarGreymon_Search_Icon.png' },
      { name: 'WarGreymon', level: '58-60', element: 'Fire', attribute: 'Vaccine', iconFile: 'WarGreymon_Search_Icon.png' },
      { name: 'SkullGreymon', level: '57-59', element: 'Pitch Black', attribute: 'Virus', iconFile: 'SkullGreymon_Search_Icon.png' },
      { name: 'Gryphonmon', level: 'Boss', element: 'Wind', attribute: 'Vaccine', iconFile: 'Gryphonmon_Search_Icon.png' },
      { name: 'Cherubimon', level: 'Seraph', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Cherubimon_Search_Icon.png' },
      { name: 'Cherubimon (White)', level: 'Boss', element: 'Light', attribute: 'Vaccine', iconFile: 'Cherubimon_(White)_Search_Icon.png' },
    ],
    portals: [
      { destination: 'Western Area: West', destinationSlug: 'western-area-west' },
      { destination: 'Digimon Maze Entrance', destinationSlug: 'digimon-maze-entrance' },
    ],
  },

  // ════════════════════════════════════════════════
  // Digimon Maze Entrance
  // ════════════════════════════════════════════════
  {
    name: 'Digimon Maze Entrance',
    slug: 'digimon-maze-entrance',
    world: 'digital-world',
    area: 'western-area',
    mapType: 'dungeon',
    levelRange: '75-79',
    description: 'An area with a huge, inverted pyramid due to strange data. To unlock, you need Tamer level 55 on gDMO or Tamer level 60 on kDMO. This area is favored by most players for training Digimon from level 41-75.',
    folderPath: path.join(ASSETS_ROOT, 'Digimon Maze Entrance'),
    mapImageFile: 'Digimon_Maze_Entrance.png',
    loadingScreenFile: 'Loading_MazeEntrance.png',
    sortOrder: 10,
    npcs: [
      { name: 'MudFrigimon', role: 'Item Seller', iconFile: 'MudFrigimon_Icon.png' },
      { name: 'PawnChessmon W', role: 'DATS Member', iconFile: 'PawnChessmon_W_Icon.png' },
      { name: 'Kamemon', role: 'Warehouse', iconFile: 'Kamemon_Eq_Merge_Icon.png' },
      { name: 'DigimonArchive', role: 'DATS', iconFile: 'DigimonArchive_Icon.png' },
    ],
    wildDigimon: [
      { name: 'Rockmon', level: '75-76', element: 'Land', attribute: 'Virus', iconFile: 'Rockmon_Search_Icon.png' },
      { name: 'Cerberumon', level: '75-77', element: 'Pitch Black', attribute: 'Vaccine', iconFile: 'Cerberumon_Search_Icon.png' },
      { name: 'Volcamon', level: '76-77', element: 'Pitch Black', attribute: 'Data', iconFile: 'Volcamon_Search_Icon.png' },
      { name: 'CannonBeemon', level: '76-77', element: 'Wind', attribute: 'Virus', iconFile: 'CannonBeemon_Search_Icon.png' },
      { name: 'PileVolcamon', level: '76-78', element: 'Land', attribute: 'Data', iconFile: 'PileVolcamon_Search_Icon.png' },
      { name: 'HisyaRyuumon', level: '75-77', element: 'Steel', attribute: 'Vaccine', iconFile: 'HisyaRyuumon_Search_Icon.png' },
      { name: 'Boltmon', level: '78', element: 'Steel', attribute: 'Data', iconFile: 'Boltmon_Search_Icon.png' },
    ],
    portals: [
      { destination: 'Dark Tower Wasteland', destinationSlug: 'dark-tower-wasteland' },
      { destination: 'Digimon Maze B2', destinationSlug: 'digimon-maze-b2' },
    ],
  },

  // ════════════════════════════════════════════════
  // Digimon Maze B2
  // ════════════════════════════════════════════════
  {
    name: 'Digimon Maze B2',
    slug: 'digimon-maze-b2',
    world: 'digital-world',
    area: 'western-area',
    mapType: 'dungeon',
    levelRange: '77-80',
    description: 'A place that is believed to have been created intentionally by someone through data manipulation. The identity of the culprit is shrouded in mystery. Requires 1 "Maze Entrance Key".',
    folderPath: path.join(ASSETS_ROOT, 'Digimon Maze B2'),
    mapImageFile: 'Digimon_Maze_B2.png',
    loadingScreenFile: 'Loading_MazeB2.png',
    sortOrder: 11,
    npcs: [],
    wildDigimon: [
      { name: 'Gladimon', level: '77-80', element: 'Steel', attribute: 'Vaccine', iconFile: 'Gladimon_Search_Icon.png' },
      { name: 'Roachmon', level: '77-80', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Roachmon_Search_Icon.png' },
      { name: 'Meramon', level: '77-80', element: 'Fire', attribute: 'Data', iconFile: 'Meramon_Search_Icon.png' },
      { name: 'Giromon', level: '77-80', element: 'Steel', attribute: 'Vaccine', iconFile: 'Giromon_Search_Icon.png' },
      { name: 'WaruMonzaemon', level: '77-80', element: 'Pitch Black', attribute: 'Virus', iconFile: 'WaruMonzaemon_Search_Icon.png' },
      { name: 'Boltmon of Blood', level: '77-80', element: 'Steel', attribute: 'Data', iconFile: 'Boltmon_of_Blood_Search_Icon.png' },
      { name: 'Boltmon of Fanatics', level: '77-80', element: 'Steel', attribute: 'Data', iconFile: 'Boltmon_of_Fanatics_Search_Icon.png' },
    ],
    portals: [
      { destination: 'Digimon Maze Entrance', destinationSlug: 'digimon-maze-entrance' },
      { destination: 'Digimon Maze B1', destinationSlug: 'digimon-maze-b1' },
    ],
  },

  // ════════════════════════════════════════════════
  // Digimon Maze B1
  // ════════════════════════════════════════════════
  {
    name: 'Digimon Maze B1',
    slug: 'digimon-maze-b1',
    world: 'digital-world',
    area: 'western-area',
    mapType: 'dungeon',
    levelRange: '78-85',
    description: 'A place that is believed to have been created intentionally by someone through data manipulation. The identity of the culprit is shrouded in mystery. Unlock by completing "Favor for Anubimon" in Maze B2.',
    folderPath: path.join(ASSETS_ROOT, 'Digimon Maze B1'),
    mapImageFile: 'Digimon_Maze_B1.png',
    loadingScreenFile: 'Loading_MazeB1.png',
    sortOrder: 12,
    npcs: [],
    wildDigimon: [
      { name: 'SkullMeramon', level: '78-80', element: 'Fire', attribute: 'Data', iconFile: 'SkullMeramon_Search_Icon.png' },
      { name: 'Andromon', level: '79-81', element: 'Steel', attribute: 'Vaccine', iconFile: 'Andromon_Search_Icon.png' },
      { name: 'Guardromon', level: '78-81', element: 'Steel', attribute: 'Virus', iconFile: 'Guardromon_Search_Icon.png' },
      { name: 'Knightmon', level: '79-81', element: 'Steel', attribute: 'Data', iconFile: 'Knightmon_Search_Icon.png' },
      { name: 'Boltmon', level: '78-85', element: 'Steel', attribute: 'Data', iconFile: 'Boltmon_Search_Icon.png' },
    ],
    portals: [
      { destination: 'Digimon Maze B2', destinationSlug: 'digimon-maze-b2' },
      { destination: 'Digimon Maze F1', destinationSlug: 'digimon-maze-f1' },
    ],
  },

  // ════════════════════════════════════════════════
  // Digimon Maze F1
  // ════════════════════════════════════════════════
  {
    name: 'Digimon Maze F1',
    slug: 'digimon-maze-f1',
    world: 'digital-world',
    area: 'western-area',
    mapType: 'dungeon',
    levelRange: '79-83',
    description: 'A place that is believed to have been created intentionally by someone through data manipulation. The identity of the culprit is shrouded in mystery. Unlock by completing "Come on, Boltmons!" in Maze B1.',
    folderPath: path.join(ASSETS_ROOT, 'Digimon Maze F1'),
    mapImageFile: 'Digimon_Maze_F1.png',
    loadingScreenFile: 'Loading_MazeF1.png',
    sortOrder: 13,
    npcs: [],
    wildDigimon: [
      { name: 'Wormmon', level: '79-80', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Wormmon_Search_Icon.png' },
      { name: 'Gotsumon', level: '79-81', element: 'Land', attribute: 'Data', iconFile: 'Gotsumon_Search_Icon.png' },
      { name: 'Goblimon', level: '79-80', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Goblimon_Search_Icon.png' },
      { name: 'Keramon', level: '79-83', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Keramon_Search_Icon.png' },
      { name: 'Bakemon', level: '80-82', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Bakemon_Search_Icon.png' },
      { name: 'Bearmon', level: '80-82', element: 'Land', attribute: 'Vaccine', iconFile: 'Bearmon_Search_Icon.png' },
      { name: 'Candlemon', level: '79-82', element: 'Fire', attribute: 'Data', iconFile: 'Candlemon_Search_Icon.png' },
    ],
    portals: [
      { destination: 'Digimon Maze B1', destinationSlug: 'digimon-maze-b1' },
      { destination: 'Digimon Maze F2', destinationSlug: 'digimon-maze-f2' },
    ],
  },

  // ════════════════════════════════════════════════
  // Digimon Maze F2
  // ════════════════════════════════════════════════
  {
    name: 'Digimon Maze F2',
    slug: 'digimon-maze-f2',
    world: 'digital-world',
    area: 'western-area',
    mapType: 'dungeon',
    levelRange: '81-84',
    description: 'A place that is believed to have been created intentionally by someone through data manipulation. The identity of the culprit is shrouded in mystery. Unlock by completing all quests in Maze F1.',
    folderPath: path.join(ASSETS_ROOT, 'Digimon Maze F2'),
    mapImageFile: 'Digimon_Maze_F2.png',
    loadingScreenFile: 'Loading_MazeF2.png',
    sortOrder: 14,
    npcs: [],
    wildDigimon: [
      { name: 'Ogremon', level: '81-83', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Ogremon_Search_Icon.png' },
      { name: 'Icemon', level: '81-83', element: 'Ice', attribute: 'Data', iconFile: 'Icemon_Search_Icon.png' },
      { name: 'Chrysalimon', level: '82-84', element: 'Pitch Black', attribute: 'Unknown', iconFile: 'Chrysalimon_Search_Icon.png' },
      { name: 'Stingmon', level: '81-83', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Stingmon_Search_Icon.png' },
      { name: 'Vegiemon', level: '81-83', element: 'Wood', attribute: 'Virus', iconFile: 'Vegiemon_Search_Icon.png' },
      { name: 'Grizzmon', level: '81-83', element: 'Land', attribute: 'Vaccine', iconFile: 'Grizzmon_Search_Icon.png' },
      { name: 'Soulmon', level: '81-83', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Soulmon_Search_Icon.png' },
      { name: 'Seadramon', level: '81-83', element: 'Water', attribute: 'Data', iconFile: 'Seadramon_Search_Icon.png' },
    ],
    portals: [
      { destination: 'Digimon Maze F1', destinationSlug: 'digimon-maze-f1' },
      { destination: 'Digimon Maze F3', destinationSlug: 'digimon-maze-f3' },
    ],
  },

  // ════════════════════════════════════════════════
  // Digimon Maze F3
  // ════════════════════════════════════════════════
  {
    name: 'Digimon Maze F3',
    slug: 'digimon-maze-f3',
    world: 'digital-world',
    area: 'western-area',
    mapType: 'dungeon',
    levelRange: '82-86',
    description: 'A place that is believed to have been created intentionally by someone through data manipulation. The identity of the culprit is shrouded in mystery. Unlock by completing all quests in Maze F2.',
    folderPath: path.join(ASSETS_ROOT, 'Digimon Maze F3'),
    mapImageFile: 'Digimon_Maze_F3.png',
    loadingScreenFile: 'Loading_MazeF3.png',
    sortOrder: 15,
    npcs: [],
    wildDigimon: [
      { name: 'Meteormon', level: '82-84', element: 'Land', attribute: 'Data', iconFile: 'Meteormon_Search_Icon.png' },
      { name: 'Pumpkinmon', level: '82-84', element: 'Pitch Black', attribute: 'Data', iconFile: 'Pumpkinmon_Search_Icon.png' },
      { name: 'Infermon', level: '83-85', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Infermon_Search_Icon.png' },
      { name: 'Andromon', level: '83-85', element: 'Steel', attribute: 'Vaccine', iconFile: 'Andromon_Search_Icon.png' },
      { name: 'JewelBeemon', level: '82-84', element: 'Light', attribute: 'Vaccine', iconFile: 'JewelBeemon_Search_Icon.png' },
      { name: 'Megadramon', level: '83-85', element: 'Steel', attribute: 'Virus', iconFile: 'Megadramon_Search_Icon.png' },
      { name: 'Phantomon', level: '83-85', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Phantomon_Search_Icon.png' },
      { name: 'MegaSeadramon', level: '83-85', element: 'Water', attribute: 'Data', iconFile: 'MegaSeadramon_Search_Icon.png' },
    ],
    portals: [
      { destination: 'Digimon Maze F2', destinationSlug: 'digimon-maze-f2' },
      { destination: 'Digimon Maze F4', destinationSlug: 'digimon-maze-f4' },
    ],
  },

  // ════════════════════════════════════════════════
  // Digimon Maze F4
  // ════════════════════════════════════════════════
  {
    name: 'Digimon Maze F4',
    slug: 'digimon-maze-f4',
    world: 'digital-world',
    area: 'western-area',
    mapType: 'dungeon',
    levelRange: '85+',
    description: 'A place that is believed to have been created intentionally by someone through data manipulation. The identity of the culprit is shrouded in mystery. Unlock by completing all quests in Maze F3.',
    folderPath: path.join(ASSETS_ROOT, 'Digimon Maze F4'),
    mapImageFile: 'Digimon_Maze_F4.png',
    loadingScreenFile: 'Loading_MazeF4.png',
    sortOrder: 16,
    npcs: [],
    wildDigimon: [
      { name: 'Diablomon', level: 'Boss', element: 'Pitch Black', attribute: 'Virus', iconFile: 'Diablomon_Search_Icon.png' },
    ],
    portals: [
      { destination: 'Digimon Maze F3', destinationSlug: 'digimon-maze-f3' },
    ],
  },

];

// ── Main Processing ──────────────────────────────────────────────────

async function processMap(mapDef) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Processing: ${mapDef.name}`);
  console.log('═'.repeat(60));

  const folder = mapDef.folderPath;

  // 1. Upload map image
  let mapImageId = null;
  if (mapDef.mapImageFile) {
    console.log('\n── Map Image ──');
    mapImageId = await uploadImage(path.join(folder, mapDef.mapImageFile), `${mapDef.name} map`);
  }

  // 2. Upload loading screen
  let loadingScreenId = null;
  if (mapDef.loadingScreenFile) {
    console.log('\n── Loading Screen ──');
    loadingScreenId = await uploadImage(path.join(folder, mapDef.loadingScreenFile), `${mapDef.name} loading screen`);
  }

  // 3. Upload NPC icons
  console.log('\n── NPC Icons ──');
  const npcData = [];
  const uploadedNpcFiles = {};
  for (const npc of mapDef.npcs) {
    let iconId = null;
    if (npc.iconFile) {
      if (!uploadedNpcFiles[npc.iconFile]) {
        uploadedNpcFiles[npc.iconFile] = await uploadImage(path.join(folder, npc.iconFile), `${npc.name} icon`);
      }
      iconId = uploadedNpcFiles[npc.iconFile];
    }
    npcData.push({ name: npc.name, role: npc.role || '', ...(iconId ? { icon: iconId } : {}) });
  }

  // 4. Upload Wild Digimon icons
  console.log('\n── Wild Digimon Icons ──');
  const digimonData = [];
  for (const d of mapDef.wildDigimon) {
    let iconId = null;
    if (d.iconFile) {
      iconId = await uploadImage(path.join(folder, d.iconFile), `${d.name} icon`);
    }
    digimonData.push({
      name: d.name,
      level: d.level || '',
      element: d.element || '',
      attribute: d.attribute || '',
      ...(iconId ? { icon: iconId } : {}),
    });
  }

  // 5. Upload gallery images
  let galleryData = undefined;
  if (mapDef.gallery && mapDef.gallery.length > 0) {
    console.log('\n── Gallery ──');
    galleryData = [];
    for (const g of mapDef.gallery) {
      const imgId = await uploadImage(path.join(folder, g.file), g.caption || mapDef.name);
      if (imgId) galleryData.push({ image: imgId, caption: g.caption || '' });
    }
  }

  // 6. Build payload
  const payload = {
    name: mapDef.name,
    slug: mapDef.slug,
    world: mapDef.world,
    area: mapDef.area,
    mapType: mapDef.mapType,
    levelRange: mapDef.levelRange || '',
    description: mapDef.description || '',
    sortOrder: mapDef.sortOrder || 0,
    published: true,
    npcs: npcData,
    wildDigimon: digimonData,
    portals: (mapDef.portals || []).map(p => ({
      destination: p.destination,
      destinationSlug: p.destinationSlug || '',
    })),
    ...(mapImageId ? { mapImage: mapImageId } : {}),
    ...(loadingScreenId ? { image: loadingScreenId } : mapImageId ? {} : {}),
    ...(galleryData && galleryData.length > 0 ? { gallery: galleryData } : {}),
  };

  // 7. Create or update map
  console.log('\n── Upserting Map ──');
  await upsertMap(mapDef.slug, payload);
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Missing CMS_ADMIN_EMAIL or CMS_ADMIN_PASSWORD environment variables');
    process.exit(1);
  }

  await login();

  let processed = 0;
  let failed = 0;
  for (const mapDef of ALL_MAPS) {
    try {
      await processMap(mapDef);
      processed++;
    } catch (err) {
      console.error(`\n✗ Error processing ${mapDef.name}:`, err.message);
      failed++;
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Done! Processed: ${processed}, Failed: ${failed}, Total: ${ALL_MAPS.length}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
