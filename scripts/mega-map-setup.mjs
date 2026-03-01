/**
 * Mega Map Setup Script
 * - Parses ALL txt files: NPCs, Wild Digimon, Raid Bosses, Drops
 * - Uploads ALL images (NPC icons, loading screens, map screenshots, items) to CMS media
 * - Links NPC icons to NPC entries
 * - Sets loading screen as banner, map screenshot as sidebar map overlay
 * - Populates drops, bosses, portals, descriptions, mapType
 *
 * Usage: CMS_ADMIN_EMAIL=x CMS_ADMIN_PASSWORD=y node scripts/mega-map-setup.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASS = process.env.CMS_ADMIN_PASSWORD;
const MAPS_ROOT = path.resolve(__dirname, '..', 'Maps');

if (!EMAIL || !PASS) { console.error('Set CMS_ADMIN_EMAIL and CMS_ADMIN_PASSWORD'); process.exit(1); }

// ═══════════════════════════════════════════════════════════
// FOLDER → SLUG MAPPING
// ═══════════════════════════════════════════════════════════
const FOLDER_TO_SLUG = {
  // File Island
  'Ancient Ruins of Secret': 'lost-historic-site',
  'Crack of Devimon': 'crack-of-devimon',
  'File Island Waterfront': 'file-island-waterfront',
  'Infinite Mountain': 'infinite-mountain',
  'Infinite Mountain Dungeon': 'infinite-mountain-dungeon',
  'Lake of the Beginning': 'lake-of-the-beginning',
  'Lost Historic Site': 'lost-historic-site',
  'Silent Forest': 'silent-forest',
  'Silver Lake': 'silver-lake',
  'Village of Beginnings': 'village-of-the-beginning',
  // Server Continent
  'Datamon Maze': 'datamon-maze',
  'Server Continent Canyon': 'server-continent-canyon',
  'Server Continent Desert': 'server-continent-desert',
  'Server Continent Pyramid': 'server-continent-pyramid',
  // Tokyo Odaiba
  'Big Sight': 'big-sight',
  'Camp Site': 'camp-site',
  'Minato City': 'minato-city',
  'Odaiba': 'odaiba',
  'Shibuya': 'shibuya',
  'Tokyo Tower': 'tokyo-tower',
  'Tokyo Tower Observatory': 'tokyo-tower-observatory',
  'Valley of Light': 'valley-of-light',
  // Western Area
  'Dark Tower Wasteland': 'dark-tower-wasteland',
  'Western Area West': 'western-area-west',
  'Western Area East': 'western-area-east',
  'Western Area Outskirts': 'western-area-outskirts',
  'Western Village': 'western-village',
  'Wilderness Area': 'wilderness-area',
  'Wind Valley': 'wind-valley',
  'Digimon Farm': 'digimon-farm',
  'Ruined Historic': 'ruined-historic',
  'Digimon Maze Entrance': 'digimon-maze-entrance',
  'Digimon Maze B1': 'digimon-maze-b1',
  'Digimon Maze B2': 'digimon-maze-b2',
  'Digimon Maze F1': 'digimon-maze-f1',
  'Digimon Maze F2': 'digimon-maze-f2',
  'Digimon Maze F3': 'digimon-maze-f3',
  'Digimon Maze F4': 'digimon-maze-f4',
  // Yokohama
  'Yokohama Village': 'yokohama-village',
  'Yokohama East Village': 'yokohama-east-village',
  'Oil Refinery-1': 'oil-refinery-1',
  'Oil Refinery-2': 'oil-refinery-2',
  'Oil Refinery-3': 'oil-refinery-3',
  // DATS
  'DATS': 'dats-center',
};

// ═══════════════════════════════════════════════════════════
// PORTAL CONNECTIONS
// ═══════════════════════════════════════════════════════════
const PORTALS = {
  'village-of-the-beginning': [
    { destination: 'D-Terminal', destinationSlug: 'd-terminal' },
    { destination: 'Silver Lake', destinationSlug: 'silver-lake' },
  ],
  'silver-lake': [
    { destination: 'Village of the Beginning', destinationSlug: 'village-of-the-beginning' },
    { destination: 'Silent Forest', destinationSlug: 'silent-forest' },
    { destination: 'Lake of the Beginning', destinationSlug: 'lake-of-the-beginning' },
  ],
  'silent-forest': [
    { destination: 'Silver Lake', destinationSlug: 'silver-lake' },
    { destination: 'File Island Waterfront', destinationSlug: 'file-island-waterfront' },
  ],
  'file-island-waterfront': [
    { destination: 'Silent Forest', destinationSlug: 'silent-forest' },
    { destination: 'Infinite Mountain', destinationSlug: 'infinite-mountain' },
    { destination: 'Lost Historic Site', destinationSlug: 'lost-historic-site' },
  ],
  'infinite-mountain': [
    { destination: 'File Island Waterfront', destinationSlug: 'file-island-waterfront' },
    { destination: 'Infinite Mountain Dungeon', destinationSlug: 'infinite-mountain-dungeon' },
  ],
  'infinite-mountain-dungeon': [
    { destination: 'Infinite Mountain', destinationSlug: 'infinite-mountain' },
  ],
  'lake-of-the-beginning': [
    { destination: 'Silver Lake', destinationSlug: 'silver-lake' },
  ],
  'lost-historic-site': [
    { destination: 'File Island Waterfront', destinationSlug: 'file-island-waterfront' },
  ],
  'crack-of-devimon': [
    { destination: 'Infinite Mountain', destinationSlug: 'infinite-mountain', requirements: "Devimon's Crack Pass" },
  ],
  'server-continent-desert': [
    { destination: 'Server Continent Canyon', destinationSlug: 'server-continent-canyon' },
    { destination: 'Server Continent Pyramid', destinationSlug: 'server-continent-pyramid' },
  ],
  'server-continent-canyon': [
    { destination: 'Server Continent Desert', destinationSlug: 'server-continent-desert' },
  ],
  'server-continent-pyramid': [
    { destination: 'Server Continent Desert', destinationSlug: 'server-continent-desert' },
    { destination: 'Datamon Maze', destinationSlug: 'datamon-maze' },
  ],
  'datamon-maze': [
    { destination: 'Server Continent Pyramid', destinationSlug: 'server-continent-pyramid', requirements: 'Datamon Maze Pass Card' },
  ],
  'camp-site': [
    { destination: 'Valley of Light', destinationSlug: 'valley-of-light' },
    { destination: 'Shibuya', destinationSlug: 'shibuya' },
  ],
  'valley-of-light': [
    { destination: 'Camp Site', destinationSlug: 'camp-site' },
  ],
  'shibuya': [
    { destination: 'Camp Site', destinationSlug: 'camp-site' },
    { destination: 'Tokyo Tower', destinationSlug: 'tokyo-tower' },
  ],
  'tokyo-tower': [
    { destination: 'Shibuya', destinationSlug: 'shibuya' },
    { destination: 'Tokyo Tower Observatory', destinationSlug: 'tokyo-tower-observatory' },
  ],
  'tokyo-tower-observatory': [
    { destination: 'Tokyo Tower', destinationSlug: 'tokyo-tower' },
  ],
  'odaiba': [
    { destination: 'Big Sight', destinationSlug: 'big-sight' },
    { destination: 'Minato City', destinationSlug: 'minato-city' },
  ],
  'big-sight': [
    { destination: 'Odaiba', destinationSlug: 'odaiba' },
  ],
  'minato-city': [
    { destination: 'Odaiba', destinationSlug: 'odaiba' },
  ],
  // Western Area
  'western-village': [
    { destination: 'Western Area: West', destinationSlug: 'western-area-west' },
    { destination: 'Wind Valley', destinationSlug: 'wind-valley' },
    { destination: 'DATS Center', destinationSlug: 'dats-center' },
  ],
  'western-area-west': [
    { destination: 'Western Village', destinationSlug: 'western-village' },
    { destination: 'Dark Tower Wasteland', destinationSlug: 'dark-tower-wasteland' },
    { destination: 'Digimon Maze Entrance', destinationSlug: 'digimon-maze-entrance' },
  ],
  'dark-tower-wasteland': [
    { destination: 'Western Area: West', destinationSlug: 'western-area-west' },
    { destination: 'Western Area: East', destinationSlug: 'western-area-east' },
  ],
  'western-area-east': [
    { destination: 'Dark Tower Wasteland', destinationSlug: 'dark-tower-wasteland' },
    { destination: 'Western Area: Outskirts', destinationSlug: 'western-area-outskirts' },
    { destination: 'Wilderness Area', destinationSlug: 'wilderness-area' },
  ],
  'western-area-outskirts': [
    { destination: 'Western Area: East', destinationSlug: 'western-area-east' },
    { destination: 'Ruined Historic', destinationSlug: 'ruined-historic' },
  ],
  'wilderness-area': [
    { destination: 'Western Area: East', destinationSlug: 'western-area-east' },
  ],
  'wind-valley': [
    { destination: 'Western Village', destinationSlug: 'western-village' },
  ],
  'ruined-historic': [
    { destination: 'Western Area: Outskirts', destinationSlug: 'western-area-outskirts' },
  ],
  'digimon-maze-entrance': [
    { destination: 'Western Area: West', destinationSlug: 'western-area-west' },
    { destination: 'Digimon Maze F1', destinationSlug: 'digimon-maze-f1' },
    { destination: 'Digimon Maze B1', destinationSlug: 'digimon-maze-b1' },
  ],
  'digimon-maze-f1': [
    { destination: 'Digimon Maze Entrance', destinationSlug: 'digimon-maze-entrance' },
    { destination: 'Digimon Maze F2', destinationSlug: 'digimon-maze-f2' },
  ],
  'digimon-maze-f2': [
    { destination: 'Digimon Maze F1', destinationSlug: 'digimon-maze-f1' },
    { destination: 'Digimon Maze F3', destinationSlug: 'digimon-maze-f3' },
  ],
  'digimon-maze-f3': [
    { destination: 'Digimon Maze F2', destinationSlug: 'digimon-maze-f2' },
    { destination: 'Digimon Maze F4', destinationSlug: 'digimon-maze-f4' },
  ],
  'digimon-maze-f4': [
    { destination: 'Digimon Maze F3', destinationSlug: 'digimon-maze-f3' },
  ],
  'digimon-maze-b1': [
    { destination: 'Digimon Maze Entrance', destinationSlug: 'digimon-maze-entrance' },
    { destination: 'Digimon Maze B2', destinationSlug: 'digimon-maze-b2' },
  ],
  'digimon-maze-b2': [
    { destination: 'Digimon Maze B1', destinationSlug: 'digimon-maze-b1' },
  ],
  // Yokohama
  'yokohama-village': [
    { destination: 'Yokohama East Village', destinationSlug: 'yokohama-east-village' },
    { destination: 'Oil Refinery 1', destinationSlug: 'oil-refinery-1' },
    { destination: 'DATS Center', destinationSlug: 'dats-center' },
  ],
  'yokohama-east-village': [
    { destination: 'Yokohama Village', destinationSlug: 'yokohama-village' },
  ],
  'oil-refinery-1': [
    { destination: 'Yokohama Village', destinationSlug: 'yokohama-village' },
    { destination: 'Oil Refinery 2', destinationSlug: 'oil-refinery-2' },
  ],
  'oil-refinery-2': [
    { destination: 'Oil Refinery 1', destinationSlug: 'oil-refinery-1' },
    { destination: 'Oil Refinery 3', destinationSlug: 'oil-refinery-3' },
  ],
  'oil-refinery-3': [
    { destination: 'Oil Refinery 2', destinationSlug: 'oil-refinery-2' },
  ],
  'dats-center': [
    { destination: 'Yokohama Village', destinationSlug: 'yokohama-village' },
    { destination: 'Western Village', destinationSlug: 'western-village' },
    { destination: 'D-Terminal B1', destinationSlug: 'd-terminal-b1' },
  ],
  'digimon-farm': [
    { destination: 'Western Village', destinationSlug: 'western-village' },
  ],
};

// ═══════════════════════════════════════════════════════════
// MAP TYPES
// ═══════════════════════════════════════════════════════════
const MAP_TYPES = {
  'village-of-the-beginning': 'town', 'camp-site': 'town', 'western-village': 'town',
  'yokohama-village': 'town', 'dats-center': 'town', 'digimon-farm': 'town',
  'crack-of-devimon': 'instance', 'datamon-maze': 'instance',
  'infinite-mountain-dungeon': 'dungeon',
  'digimon-maze-entrance': 'dungeon', 'digimon-maze-b1': 'dungeon', 'digimon-maze-b2': 'dungeon',
  'digimon-maze-f1': 'dungeon', 'digimon-maze-f2': 'dungeon', 'digimon-maze-f3': 'dungeon', 'digimon-maze-f4': 'dungeon',
};

// ═══════════════════════════════════════════════════════════
// PARSERS
// ═══════════════════════════════════════════════════════════
function parseNPCs(content) {
  const npcs = [];
  const lines = content.split(/\r?\n/);
  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "NPC's" || line === 'NPCs') { inSection = true; continue; }
    if (inSection) {
      if (/^(Drops|Notes|Loading|Category|Categories|HTML:)/.test(line)) { inSection = false; continue; }
      if (line === '') {
        let nextNonEmpty = '';
        for (let j = i + 1; j < lines.length && j < i + 3; j++) {
          const nl = lines[j].trim();
          if (nl) { nextNonEmpty = nl; break; }
        }
        if (!nextNonEmpty.startsWith('\t') && !nextNonEmpty.match(/^\S.*<.*>/)) { inSection = false; }
        continue;
      }
      const stripped = lines[i].replace(/^\t+/, '');
      const match = stripped.match(/^(.+?)\s*(?:<(.+?)>)?\s*$/);
      if (match && match[1].trim()) {
        const name = match[1].trim();
        const role = match[2] ? match[2].trim() : '';
        if (name && !name.startsWith('Category') && !name.startsWith('Loading') && !name.startsWith('HTML')) {
          npcs.push({ name, role });
        }
      }
    }
  }
  return npcs;
}

function parseDrops(content) {
  const drops = [];
  const lines = content.split(/\r?\n/);
  let inDrops = false;
  let currentMonster = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'Drops' || line === 'Raid Drops List' || line.startsWith('Drops')) {
      inDrops = true; continue;
    }
    if (inDrops) {
      if (/^(Loading|Category|Categories|HTML:|Notes|NPC)/.test(line)) { inDrops = false; continue; }
      if (line === '') continue;
      // Check if this is a monster name header (typically indented with tab)
      const strippedLine = lines[i].replace(/^\t+/, '').trim();
      // Monster name lines often appear as standalone names or "All those raid bosses drops:"
      if (strippedLine.match(/^[A-Z][\w\s()'-]+$/) && !strippedLine.match(/^\d/) && !strippedLine.includes('Rank') && !strippedLine.includes('chance')) {
        // Could be a monster name or an item
        // Check if next lines start with quantity patterns
        let nextLine = '';
        for (let j = i + 1; j < lines.length && j < i + 3; j++) {
          const nl = lines[j].trim();
          if (nl) { nextLine = nl; break; }
        }
        if (nextLine.match(/^\d/) || nextLine.includes('x ') || nextLine.includes('x  ')) {
          currentMonster = strippedLine;
          continue;
        }
      }
      // Parse item drop line
      const itemMatch = strippedLine.match(/^(?:(\d+(?:-\d+)?x?)\s+)?(.+)$/);
      if (itemMatch && itemMatch[2]) {
        const quantity = itemMatch[1] || '1x';
        const item = itemMatch[2].trim();
        if (item && !item.includes('Rank ') && !item.startsWith('All ') && item.length > 1) {
          drops.push({ monster: currentMonster || 'Various', item, quantity });
        }
      }
    }
  }
  return drops;
}

function parseDescription(content) {
  const lines = content.split(/\r?\n/);
  const skipPatterns = /^(Wild|NPC|Quest|Conditions|The normal mode|Main Quests|Digimon|Non-aggressive|Aggressive|Toggle|Page|Discussion|English|Read|Edit|Watch|Tools|Search|Eski|Appearance|Alerts|Notice|Watchlist|Personal|Main menu|Main page|Mercenary|Help|Recent|New pages|Syntax|Switch|Only|HP:|Level)/;
  for (let i = 20; i < Math.min(lines.length, 50); i++) {
    const line = lines[i].trim();
    if (line && line.length > 20 && !skipPatterns.test(line)) {
      return line.slice(0, 500);
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// IMAGE HELPERS
// ═══════════════════════════════════════════════════════════
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
}

function isImageFile(f) {
  return /\.(png|jpg|jpeg|gif|webp)$/i.test(f);
}

function isLoadingScreen(f) {
  const lower = f.toLowerCase();
  return lower.includes('loading') || lower.includes('_load') || lower.endsWith('load.png');
}

function isNpcIcon(f) {
  return f.includes('_Icon') || f.includes('NPC_Icon') || f.endsWith('_Icon.png');
}

function isSearchIcon(f) {
  return f.includes('_Search_Icon');
}

function isMainMapImage(f, folderName) {
  const base = path.basename(f, path.extname(f)).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const norm = folderName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return base === norm || base === norm + '1' || base === norm + '2';
}

async function uploadMedia(filePath, token) {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const blob = new Blob([fileBuffer], { type: getMimeType(fileName) });
  formData.append('file', blob, fileName);
  formData.append('alt', fileName.replace(/[_-]/g, ' ').replace(/\.\w+$/, ''));
  try {
    const res = await fetch(`${CMS}/api/media`, {
      method: 'POST',
      headers: { Authorization: `JWT ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      // If file already exists, try to find it
      if (err.includes('already exists') || res.status === 400) {
        return await findExistingMedia(fileName, token);
      }
      console.error(`    UPLOAD FAIL ${fileName}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.doc || data;
  } catch (e) {
    console.error(`    UPLOAD ERROR ${fileName}: ${e.message}`);
    return null;
  }
}

async function findExistingMedia(filename, token) {
  try {
    const res = await fetch(`${CMS}/api/media?where[filename][equals]=${encodeURIComponent(filename)}&limit=1`, {
      headers: { Authorization: `JWT ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.docs?.[0] || null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
async function main() {
  // Login
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (!loginRes.ok) { console.error('Login failed'); process.exit(1); }
  const { token } = await loginRes.json();
  console.log('✓ Logged in\n');

  // Fetch all maps
  const mapsRes = await fetch(`${CMS}/api/maps?limit=200&depth=1`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const mapsData = await mapsRes.json();
  const maps = {};
  for (const m of mapsData.docs || []) maps[m.slug] = m;
  console.log(`Found ${Object.keys(maps).length} maps in CMS.\n`);

  // Find all map folders
  function findMapFolders(dir) {
    if (!fs.existsSync(dir)) return [];
    const results = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (FOLDER_TO_SLUG[item.name]) {
          results.push({ name: item.name, path: fullPath, slug: FOLDER_TO_SLUG[item.name] });
        }
        results.push(...findMapFolders(fullPath));
      }
    }
    return results;
  }

  const mapFolders = findMapFolders(MAPS_ROOT);
  // Deduplicate by slug (keep the one with more files)
  const foldersBySlug = {};
  for (const f of mapFolders) {
    if (!foldersBySlug[f.slug]) {
      foldersBySlug[f.slug] = [f];
    } else {
      foldersBySlug[f.slug].push(f);
    }
  }

  console.log(`Found ${Object.keys(foldersBySlug).length} unique map folders.\n`);

  let totalUpdated = 0;
  let totalImages = 0;

  for (const [slug, folders] of Object.entries(foldersBySlug)) {
    const map = maps[slug];
    if (!map) { console.log(`  SKIP ${slug} (not in CMS)`); continue; }

    console.log(`\n═══ ${slug} ═══`);

    // Collect all files from all folders for this map
    const allImages = [];
    const allTxtContent = [];
    for (const folder of folders) {
      const files = fs.readdirSync(folder.path);
      for (const f of files) {
        const fp = path.join(folder.path, f);
        if (isImageFile(f)) allImages.push({ name: f, path: fp, folder: folder.name });
        if (f.endsWith('.txt')) {
          allTxtContent.push(fs.readFileSync(fp, 'utf-8'));
        }
      }
    }

    const patch = {};
    const changes = [];

    // ── Parse NPCs from txt files ──
    let allNpcs = [];
    let allDrops = [];
    let description = null;
    for (const content of allTxtContent) {
      const npcs = parseNPCs(content);
      for (const npc of npcs) {
        if (!allNpcs.some(n => n.name === npc.name && n.role === npc.role)) {
          allNpcs.push(npc);
        }
      }
      const drops = parseDrops(content);
      allDrops.push(...drops);
      if (!description) description = parseDescription(content);
    }

    // Special: Village of Beginning has no wild digimon
    if (slug === 'village-of-the-beginning') {
      patch.wildDigimon = [];
      changes.push('cleared-wild-digimon');
    }

    // ── Upload NPC icons and link them ──
    if (allNpcs.length > 0) {
      const npcEntries = [];
      for (const npc of allNpcs) {
        // Try to find a matching icon image
        const npcNameNorm = npc.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        let iconMedia = null;
        for (const img of allImages) {
          if (!isNpcIcon(img.name) && !img.name.includes('NPC')) continue;
          const imgNorm = path.basename(img.name, path.extname(img.name)).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          if (imgNorm.includes(npcNameNorm) || npcNameNorm.includes(imgNorm.replace('icon', '').replace('npc', ''))) {
            console.log(`  NPC icon: ${npc.name} → ${img.name}`);
            iconMedia = await uploadMedia(img.path, token);
            totalImages++;
            break;
          }
        }
        const entry = { name: npc.name, role: npc.role };
        if (iconMedia) entry.icon = iconMedia.id;
        npcEntries.push(entry);
      }
      patch.npcs = npcEntries;
      changes.push(`npcs=${allNpcs.length}`);
    }

    // ── Upload drops ──
    if (allDrops.length > 0) {
      patch.drops = allDrops.map(d => ({ monster: d.monster, item: d.item, quantity: d.quantity }));
      changes.push(`drops=${allDrops.length}`);
    }

    // ── Upload images: loading screen → banner, map → overlay ──
    let loadingScreenFile = null;
    let mainMapFile = null;
    const primaryFolder = folders[0].name;

    for (const img of allImages) {
      if (!loadingScreenFile && isLoadingScreen(img.name)) loadingScreenFile = img;
      if (!mainMapFile && isMainMapImage(img.name, img.folder)) mainMapFile = img;
    }
    // Fallback: if no main map image found, use first non-icon large image
    if (!mainMapFile) {
      for (const img of allImages) {
        if (!isNpcIcon(img.name) && !isSearchIcon(img.name) && !isLoadingScreen(img.name)) {
          const stat = fs.statSync(img.path);
          if (stat.size > 50000) { mainMapFile = img; break; }
        }
      }
    }

    // Upload and set: loading screen → image (banner), map screenshot → mapImage (sidebar)
    const currentImage = map.image;
    const currentMapImage = map.mapImage;

    if (loadingScreenFile) {
      console.log(`  Banner (loading): ${loadingScreenFile.name}`);
      const media = await uploadMedia(loadingScreenFile.path, token);
      if (media) { patch.image = media.id; totalImages++; changes.push('banner'); }
    } else if (!currentImage && mainMapFile) {
      // No loading screen, use map screenshot as banner
      console.log(`  Banner (map): ${mainMapFile.name}`);
      const media = await uploadMedia(mainMapFile.path, token);
      if (media) { patch.image = media.id; totalImages++; changes.push('banner-from-map'); }
    }

    if (mainMapFile && loadingScreenFile) {
      // If we have both, map goes to sidebar
      console.log(`  Sidebar map: ${mainMapFile.name}`);
      const media = await uploadMedia(mainMapFile.path, token);
      if (media) { patch.mapImage = media.id; totalImages++; changes.push('sidebar-map'); }
    }

    // ── Upload gallery images (non-icon, non-loading, non-main images) ──
    const galleryItems = [];
    for (const img of allImages) {
      if (img === loadingScreenFile || img === mainMapFile) continue;
      if (isSearchIcon(img.name)) continue; // Skip wild digimon search icons
      const stat = fs.statSync(img.path);
      if (stat.size < 5000) continue; // Skip tiny files
      // Upload meaningful images
      if (stat.size > 20000 || isNpcIcon(img.name)) continue; // Skip NPC icons from gallery (already linked)
      // Actually, let's be selective: only add actual map-related images to gallery
    }
    // Upload significant non-icon images
    for (const img of allImages) {
      if (img === loadingScreenFile || img === mainMapFile) continue;
      if (isSearchIcon(img.name) || isNpcIcon(img.name)) continue;
      const stat = fs.statSync(img.path);
      if (stat.size > 30000) { // Only larger images (actual screenshots/maps)
        console.log(`  Gallery: ${img.name}`);
        const media = await uploadMedia(img.path, token);
        if (media) {
          galleryItems.push({ image: media.id, caption: img.name.replace(/[_-]/g, ' ').replace(/\.\w+$/, '') });
          totalImages++;
        }
      }
    }
    if (galleryItems.length > 0) {
      patch.gallery = galleryItems;
      changes.push(`gallery=${galleryItems.length}`);
    }

    // ── Portals ──
    if (PORTALS[slug]) {
      patch.portals = PORTALS[slug];
      changes.push(`portals=${PORTALS[slug].length}`);
    }

    // ── Map type ──
    const mapType = MAP_TYPES[slug] || 'field';
    if (map.mapType !== mapType) {
      patch.mapType = mapType;
      changes.push(`type=${mapType}`);
    }

    // ── Description ──
    if (description && !map.description) {
      patch.description = description;
      changes.push('desc');
    }

    if (changes.length === 0) { console.log('  (no changes)'); continue; }

    // Apply patch
    const patchRes = await fetch(`${CMS}/api/maps/${map.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: JSON.stringify(patch),
    });
    if (patchRes.ok) {
      console.log(`  ✓ ${changes.join(', ')}`);
      totalUpdated++;
    } else {
      const err = await patchRes.text();
      console.error(`  ✗ PATCH failed: ${patchRes.status} ${err.slice(0, 200)}`);
    }
  }

  console.log(`\n\n═══ DONE! Maps updated: ${totalUpdated}, Images uploaded: ${totalImages} ═══`);
}

main().catch(console.error);
