// Script to auto-match loading screen images to CMS maps and upload them
import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';

const CMS = 'http://localhost:3001';
const IMG_DIR = '/home/deploy/app/loading-screens';

// Login
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;

const loginR = await fetch(`${CMS}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const loginD = await loginR.json();
const token = loginD.token;
if (!token) { console.error('Login failed'); process.exit(1); }
console.log('✅ Logged in');

// Fetch all maps
const mapsR = await fetch(`${CMS}/api/maps?limit=200&depth=0`, {
  headers: { Authorization: `JWT ${token}` },
});
const mapsD = await mapsR.json();
const maps = mapsD.docs;
console.log(`Found ${maps.length} maps in CMS\n`);

// List available loading screen files
const files = await readdir(IMG_DIR);
const pngFiles = files.filter(f => f.endsWith('.png'));
console.log(`Found ${pngFiles.length} loading screen images\n`);

// Build a mapping: normalize filename to a key for matching
// e.g. Loading_WindValley.png -> windvalley
function normalizeFilename(f) {
  return f
    .replace(/^[Ll]oading_/, '')
    .replace(/\.png$/, '')
    .toLowerCase()
    .replace(/[-_\s]/g, '');
}

// Normalize map names/slugs for matching
function normalizeMapName(name) {
  return name
    .toLowerCase()
    .replace(/[-_\s]/g, '')
    .replace(/['']/g, '');
}

// Manual mapping for tricky names (filename key -> map slug)
const MANUAL_MAP = {
  'dats': 'dats-center',
  'old_dats': 'dats-center',
  'yokovillageold': 'yokohama-village',
  'minato': 'minato-mirai',
  'odaiba': 'odaiba',
  'shibuya': 'shibuya',
  'bigsight': 'tokyo-big-sight',
  'tokyotower': 'tokyo-tower',
  'tokyotowerobservatory': 'tokyo-tower-observatory',
  'fujtvrooftop': 'fuji-tv-rooftop',
  'silentforest': 'silent-forest',
  'silverlake': 'silver-lake',
  'wildernessarea': 'wilderness-area',
  'windvalley': 'wind-valley',
  'ruinedhistoric': 'ruined-historic',
  'digimonf arm': 'digimon-farm',
  'digimonfarm': 'digimon-farm',
  'westernvillage': 'western-village',
  'westernareawest': 'western-area-west',
  'valleyoflight': 'valley-of-light',
  'darktower': 'dark-tower',
  'datamonmaze': 'datamon-maze',
  'mazeentrance': 'digimon-maze-entrance',
  'mazeb1': 'digimon-maze-b1',
  'mazeb2': 'digimon-maze-b2',
  'mazef1': 'digimon-maze-f1',
  'mazef2': 'digimon-maze-f2',
  'mazef3': 'digimon-maze-f3',
  'mazef4': 'digimon-maze-f4',
  'losthistoricsite': 'lost-historic-site',
  'infinitemountain': 'infinite-mountain',
  'infinitemountaindungeon': 'infinite-mountain-dungeon',
  'misovillage': 'miso-village',
  'verdandi': 'verdandi-terminal',
  'fileislandwaterfront': 'file-island-waterfront',
  'crackofdevimon': 'crack-of-devimon',
  'villageofthebeginning': 'village-of-the-beginning',
  'village-of-the-beginning': 'village-of-the-beginning',
  'oilrefinery1': 'oil-refinery-1',
  'oilrefinery2': 'oil-refinery-2',
  'oilrefinery3': 'oil-refinery-3',
  'royalbase': 'royal-base',
  'servercontinentdesert': 'server-continent-desert',
  'servercontinentcanyon': 'server-continent-canyon',
  'servercontinentpyramid': 'server-continent-pyramid',
  'venomousvortex': 'venom-vortex',
  'colosseum': 'colosseum',
  'arena': 'arena',
  'kaiserslabeasy': 'kaisers-lab-easy',
  'kaiserslabhard': 'kaisers-lab-hard',
  'kaisersdomain': 'kaisers-domain',
  'kaiserslagnormal': 'kaisers-lab-normal',
  'dterminal': 'd-terminal',
  'dterminalb1': 'd-terminal-b1',
  'dterminalb2': 'd-terminal-b2',
  'tutorial': 'tutorial',
  'undergroundsummonsquare': 'underground-summon-square',
  'campsite': 'camp-site',
  'rainbowbridge': 'rainbow-bridge',
  'road': 'road',
  'stadium': 'stadium',
  'cloudarea': 'cloud-area',
  'clouarea': 'cloud-area',
  'forestarea': 'forest-area',
  'oceanarea': 'ocean-area',
  'wastelandarea': 'wasteland-area',
  'wastelandareanight': 'wasteland-area-night',
  // DG maps
  'bdg': 'bdg',
  'edg': 'edg',
  'fdg': 'fdg',
  'qdg': 'qdg',
  'zdg': 'zdg',
};

// Numbered loading screens - these are map IDs from the game
// We'll try to identify them later
const NUMBERED_MAP = {
  // Yokohama area
  '100': 'yokohama-village',
  '101': 'minato-mirai',
  '102': 'odaiba',
  '103': 'shibuya',
  '104': 'tokyo-big-sight',
  '105': 'dats-center',
  '110': 'tokyo-tower',
  // Western area
  '20': 'western-village',
  '21': 'wilderness-area',
  '22': 'wind-valley',
  '23': 'ruined-historic',
  '24': 'digimon-farm',
  '25': 'western-area-west',
  '26': 'valley-of-light',
  '27': 'dark-tower',
  '50': 'silent-forest',
  '51': 'silver-lake',
  '88': 'infinite-mountain',
};

// Build slug -> map lookup
const slugToMap = {};
for (const m of maps) {
  slugToMap[m.slug] = m;
}

// Match files to maps
const allMatches = [];
const unmatched = [];

for (const file of pngFiles) {
  const normFile = normalizeFilename(file);
  const isNumbered = /^[Ll]oading_?\d+\.png$/.test(file);
  
  // Try manual mapping first
  let mapSlug = MANUAL_MAP[normFile];
  
  // Try numbered mapping
  if (!mapSlug) {
    const numMatch = file.match(/[Ll]oading_?(\d+)\.png/);
    if (numMatch) {
      mapSlug = NUMBERED_MAP[numMatch[1]];
    }
  }
  
  // Try fuzzy match against map names/slugs
  if (!mapSlug) {
    for (const m of maps) {
      const normSlug = normalizeMapName(m.slug);
      const normName = normalizeMapName(m.name);
      if (normFile === normSlug || normFile === normName) {
        mapSlug = m.slug;
        break;
      }
      // Partial match
      if (normFile.length > 4 && (normSlug.includes(normFile) || normFile.includes(normSlug))) {
        mapSlug = m.slug;
        break;
      }
    }
  }
  
  if (mapSlug && slugToMap[mapSlug]) {
    allMatches.push({ file, mapSlug, mapName: slugToMap[mapSlug].name, mapId: slugToMap[mapSlug].id, hasImage: !!slugToMap[mapSlug].image, isNumbered });
  } else {
    unmatched.push({ file, normFile, guessedSlug: mapSlug || null });
  }
}

// Deduplicate: prefer named files over numbered ones for the same map
const bestMatch = {};
for (const m of allMatches) {
  const existing = bestMatch[m.mapSlug];
  if (!existing) {
    bestMatch[m.mapSlug] = m;
  } else if (existing.isNumbered && !m.isNumbered) {
    // Prefer named file
    bestMatch[m.mapSlug] = m;
  }
  // If both named or both numbered, keep first
}
const matched = Object.values(bestMatch);

console.log(`=== MATCHED: ${matched.length} ===`);
for (const m of matched.sort((a, b) => a.mapName.localeCompare(b.mapName))) {
  console.log(`  ${m.file} -> ${m.mapName} (${m.mapSlug}) ${m.hasImage ? '[HAS IMAGE]' : '[NO IMAGE]'}`);
}

console.log(`\n=== UNMATCHED: ${unmatched.length} ===`);
for (const u of unmatched) {
  console.log(`  ${u.file} (norm: ${u.normFile}) ${u.guessedSlug ? `guessed: ${u.guessedSlug}` : ''}`);
}

// Now upload matched images to CMS and link to maps
console.log('\n=== UPLOADING & LINKING ===');
let uploaded = 0;
let skipped = 0;
let errors = 0;

for (const m of matched) {
  const filePath = path.join(IMG_DIR, m.file);
  
  try {
    // Read file
    const fileData = readFileSync(filePath);
    
    // Create FormData
    const formData = new FormData();
    const blob = new Blob([fileData], { type: 'image/png' });
    formData.append('file', blob, m.file);
    formData.append('alt', `${m.mapName} Loading Screen`);
    formData.append('imageType', 'map-loading');
    formData.append('source', 'DMO Game Client');
    formData.append('credits', 'Joymax / MOVE Games');
    
    // Upload to media
    const uploadR = await fetch(`${CMS}/api/media`, {
      method: 'POST',
      headers: { Authorization: `JWT ${token}` },
      body: formData,
    });
    
    if (!uploadR.ok) {
      const err = await uploadR.text();
      console.log(`  ❌ Upload failed for ${m.file}: ${err.substring(0, 200)}`);
      errors++;
      continue;
    }
    
    const media = await uploadR.json();
    const mediaId = media.doc?.id || media.id;
    console.log(`  📤 Uploaded ${m.file} -> media ID: ${mediaId}`);
    
    // Link to map's image field
    const patchR = await fetch(`${CMS}/api/maps/${m.mapId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ image: mediaId }),
    });
    
    if (patchR.ok) {
      console.log(`  ✅ Linked to map: ${m.mapName}`);
      uploaded++;
    } else {
      const err = await patchR.text();
      console.log(`  ❌ Patch failed for ${m.mapName}: ${err.substring(0, 200)}`);
      errors++;
    }
  } catch (e) {
    console.log(`  ❌ Error processing ${m.file}: ${e.message}`);
    errors++;
  }
}

console.log(`\n=== DONE ===`);
console.log(`Uploaded & linked: ${uploaded}`);
console.log(`Errors: ${errors}`);
console.log(`Unmatched files: ${unmatched.length}`);
