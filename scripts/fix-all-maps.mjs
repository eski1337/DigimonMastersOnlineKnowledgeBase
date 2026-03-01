/**
 * Comprehensive map data fix script.
 * - Parses NPCs from all .txt wiki dump files
 * - Fixes Village of Beginning (no wild digimon, add NPCs)
 * - Swaps image/mapImage so loading screen is the banner
 * - Adds portal connections between maps
 * - Adds descriptions and mapType
 *
 * Usage: CMS_ADMIN_EMAIL=x CMS_ADMIN_PASSWORD=y node scripts/fix-all-maps.mjs
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

// ── Folder → slug mapping ──────────────────────────────────
const FOLDER_TO_SLUG = {
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
  'Datamon Maze': 'datamon-maze',
  'Server Continent Canyon': 'server-continent-canyon',
  'Server Continent Desert': 'server-continent-desert',
  'Server Continent Pyramid': 'server-continent-pyramid',
  'Big Sight': 'big-sight',
  'Camp Site': 'camp-site',
  'Minato City': 'minato-city',
  'Odaiba': 'odaiba',
  'Shibuya': 'shibuya',
  'Tokyo Tower': 'tokyo-tower',
  'Tokyo Tower Observatory': 'tokyo-tower-observatory',
  'Valley of Light': 'valley-of-light',
  'Dark Tower Wasteland': 'dark-tower-wasteland',
  'Western Area West': 'western-area-west',
  'Digimon Maze Entrance': 'digimon-maze-entrance',
  'Digimon Maze B1': 'digimon-maze-b1',
  'Digimon Maze B2': 'digimon-maze-b2',
  'Digimon Maze F1': 'digimon-maze-f1',
  'Digimon Maze F2': 'digimon-maze-f2',
  'Digimon Maze F3': 'digimon-maze-f3',
  'Digimon Maze F4': 'digimon-maze-f4',
};

// ── Portal connections ─────────────────────────────────────
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
    { destination: 'Infinite Mountain', destinationSlug: 'infinite-mountain', requirements: 'Devimon\'s Crack Pass' },
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
};

// ── Map types ──────────────────────────────────────────────
const MAP_TYPES = {
  'village-of-the-beginning': 'town',
  'camp-site': 'town',
  'crack-of-devimon': 'instance',
  'datamon-maze': 'instance',
  'infinite-mountain-dungeon': 'dungeon',
  'lake-of-the-beginning': 'field',
  'silver-lake': 'field',
  'silent-forest': 'field',
  'file-island-waterfront': 'field',
  'infinite-mountain': 'field',
  'lost-historic-site': 'field',
  'server-continent-canyon': 'field',
  'server-continent-desert': 'field',
  'server-continent-pyramid': 'field',
  'big-sight': 'field',
  'odaiba': 'field',
  'minato-city': 'field',
  'shibuya': 'field',
  'tokyo-tower': 'field',
  'tokyo-tower-observatory': 'field',
  'valley-of-light': 'field',
};

// ── Descriptions ───────────────────────────────────────────
const DESCRIPTIONS = {
  'village-of-the-beginning': 'Beautiful and cute village with baby Digimon. This is the classic Village of Beginnings of Digimon Adventure. It\'s part of File Island and is the location that all Digimon eggs go to after a Digimon dies. Also known as Primary Village.',
  'silver-lake': 'A calm lake area in File Island with various Rookie and Champion level Digimon. Connects to Village of the Beginning and Silent Forest.',
  'silent-forest': 'Eerie jungle with graveyard and dark forest. Quest unlock at Digimon Level 54.',
  'file-island-waterfront': 'A place where grand mountain, expansive sea and warm wood coexist. Main Quests available at Digimon Level 74.',
  'infinite-mountain': 'A place that is made up of rocks with wild wind. Requires Monochromon Mark to enter.',
  'infinite-mountain-dungeon': 'A dungeon located inside Infinite Mountain with challenging Digimon encounters.',
  'lake-of-the-beginning': 'A serene lake near the Village of Beginnings on File Island.',
  'lost-historic-site': 'Ancient ruins containing powerful Digimon and raid bosses. Also known as Ancient Ruins of Secret.',
  'crack-of-devimon': 'The place of Devimon\'s rest at the top of Infinity Mountain. Instance dungeon with 20 minute time limit. Requires Level 99 and Devimon\'s Crack Pass.',
  'server-continent-desert': 'A vast desert area on the Server Continent with various Digimon.',
  'server-continent-canyon': 'Rocky canyon area on the Server Continent.',
  'server-continent-pyramid': 'Ancient pyramid area on the Server Continent, gateway to Datamon Maze.',
  'datamon-maze': 'Instance dungeon inside the Server Continent Pyramid. Requires Datamon Maze Pass Card.',
  'camp-site': 'A safe camping area in Tokyo Odaiba, serving as a hub for nearby zones.',
  'valley-of-light': 'A beautiful valley area in Tokyo Odaiba.',
  'shibuya': 'The bustling Shibuya district in Tokyo, infested with Digimon.',
  'tokyo-tower': 'The iconic Tokyo Tower area with Digimon encounters.',
  'tokyo-tower-observatory': 'The observation deck of Tokyo Tower with challenging Digimon.',
  'odaiba': 'The Odaiba waterfront area in Tokyo.',
  'big-sight': 'The Big Sight convention center area in Tokyo Odaiba.',
  'minato-city': 'Minato City district in Tokyo with water-type Digimon.',
};

// ── Parse NPCs from txt file ───────────────────────────────
function parseNPCs(content) {
  const npcs = [];
  const lines = content.split(/\r?\n/);
  let inNPCSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "NPC's" || line === 'NPCs') {
      inNPCSection = true;
      continue;
    }

    if (inNPCSection) {
      // End of NPC section
      if (/^(Drops|Notes|Loading|Category|Categories|HTML:)/.test(line) || line === '') {
        if (line === '') {
          // Could be gap between NPCs, check if next non-empty line is still an NPC
          let nextNonEmpty = '';
          for (let j = i + 1; j < lines.length && j < i + 3; j++) {
            const nl = lines[j].trim();
            if (nl) { nextNonEmpty = nl; break; }
          }
          if (!nextNonEmpty.startsWith('\t') && !nextNonEmpty.match(/^\S.*<.*>/)) {
            inNPCSection = false;
          }
          continue;
        }
        inNPCSection = false;
        continue;
      }

      // Parse NPC line: "\tName\t<Role>" or "Name\t<Role>"
      const stripped = lines[i].replace(/^\t+/, '');
      const match = stripped.match(/^(.+?)\s*(?:<(.+?)>)?\s*$/);
      if (match && match[1].trim()) {
        const name = match[1].trim();
        const role = match[2] ? match[2].trim() : '';
        // Skip empty/garbage lines
        if (name && !name.startsWith('Category') && !name.startsWith('Loading') && !name.startsWith('HTML')) {
          npcs.push({ name, role });
        }
      }
    }
  }
  return npcs;
}

// ── Parse description from txt ─────────────────────────────
function parseDescription(content) {
  const lines = content.split(/\r?\n/);
  // Look for description text between the header boilerplate and "Wild Digimon" or "Quest"
  for (let i = 20; i < Math.min(lines.length, 50); i++) {
    const line = lines[i].trim();
    if (line && line.length > 20 && !line.startsWith('Wild') && !line.startsWith('NPC') &&
        !line.startsWith('Quest') && !line.startsWith('Conditions') &&
        !line.startsWith('The normal mode') && !line.startsWith('Main Quests') &&
        !line.match(/^(Digimon|Non-aggressive|Aggressive|Toggle|Page|Discussion|English|Read|Edit|Watch|Tools|Search|Eski|Appearance|Alerts|Notice|Watchlist|Personal|Main menu|Main page|Mercenary|Help|Recent|New pages|Syntax|Switch)/)) {
      return line;
    }
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────
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

  // Fetch all maps with depth=1 to get image data
  const mapsRes = await fetch(`${CMS}/api/maps?limit=200&depth=1`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const mapsData = await mapsRes.json();
  const maps = {};
  for (const m of mapsData.docs || []) maps[m.slug] = m;
  console.log(`Found ${Object.keys(maps).length} maps in CMS.\n`);

  // ── Step 1: Parse all txt files for NPCs ─────────────────
  console.log('═══ Step 1: Parsing NPCs from txt files ═══');
  const npcsBySlug = {};
  const descriptionsBySlug = {};

  const regionDirs = [];
  // Scan all subdirectories under Maps/
  function findTxtFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const results = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results.push(...findTxtFiles(fullPath));
      } else if (item.name.endsWith('.txt')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const txtFiles = findTxtFiles(MAPS_ROOT);
  console.log(`Found ${txtFiles.length} txt files\n`);

  for (const txtPath of txtFiles) {
    const content = fs.readFileSync(txtPath, 'utf-8');
    const npcs = parseNPCs(content);
    const desc = parseDescription(content);

    // Determine slug from folder name
    const parts = txtPath.split(path.sep);
    let folderName = null;
    for (let i = parts.length - 2; i >= 0; i--) {
      if (FOLDER_TO_SLUG[parts[i]]) {
        folderName = parts[i];
        break;
      }
    }

    if (!folderName) continue;
    const slug = FOLDER_TO_SLUG[folderName];

    if (npcs.length > 0) {
      if (!npcsBySlug[slug]) npcsBySlug[slug] = [];
      // Avoid duplicates from multiple txt files for same map
      for (const npc of npcs) {
        const exists = npcsBySlug[slug].some(n => n.name === npc.name && n.role === npc.role);
        if (!exists) npcsBySlug[slug].push(npc);
      }
      console.log(`  ${folderName} → ${slug}: ${npcs.length} NPCs`);
    }

    if (desc && !descriptionsBySlug[slug]) {
      descriptionsBySlug[slug] = desc;
    }
  }

  // ── Step 2: Apply all fixes ──────────────────────────────
  console.log('\n═══ Step 2: Applying fixes to CMS ═══\n');

  // Collect all slugs that need updating
  const allSlugs = new Set([
    ...Object.keys(npcsBySlug),
    ...Object.keys(PORTALS),
    ...Object.keys(MAP_TYPES),
    ...Object.keys(DESCRIPTIONS),
  ]);

  let updated = 0;
  let errors = 0;

  for (const slug of allSlugs) {
    const map = maps[slug];
    if (!map) { console.log(`  SKIP ${slug} (not in CMS)`); continue; }

    const patch = {};
    let changes = [];

    // ── NPCs ──
    const npcs = npcsBySlug[slug];
    if (npcs && npcs.length > 0) {
      patch.npcs = npcs.map(n => ({ name: n.name, role: n.role }));
      changes.push(`npcs=${npcs.length}`);
    }

    // ── Portals ──
    const portals = PORTALS[slug];
    if (portals) {
      patch.portals = portals;
      changes.push(`portals=${portals.length}`);
    }

    // ── Map type ──
    const mapType = MAP_TYPES[slug];
    if (mapType && map.mapType !== mapType) {
      patch.mapType = mapType;
      changes.push(`type=${mapType}`);
    }

    // ── Description ──
    const desc = DESCRIPTIONS[slug] || descriptionsBySlug[slug];
    if (desc && !map.description) {
      patch.description = desc;
      changes.push('desc');
    }

    // ── Fix Village of Beginning: clear wild digimon ──
    if (slug === 'village-of-the-beginning') {
      patch.wildDigimon = [];
      changes.push('cleared-wild-digimon');
    }

    // ── Fix images: swap so loading screen is banner ──
    const currentImage = map.image;   // Currently the map screenshot
    const currentMapImage = map.mapImage; // Currently the loading screen
    if (currentImage && currentMapImage) {
      const imageId = typeof currentImage === 'object' ? currentImage.id : currentImage;
      const mapImageId = typeof currentMapImage === 'object' ? currentMapImage.id : currentMapImage;
      // Swap: loading screen becomes main banner, map screenshot becomes overlay
      patch.image = mapImageId;
      patch.mapImage = imageId;
      changes.push('swapped-images');
    }

    if (changes.length === 0) continue;

    // Apply patch
    const patchRes = await fetch(`${CMS}/api/maps/${map.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: JSON.stringify(patch),
    });

    if (patchRes.ok) {
      console.log(`  ✓ ${slug}: ${changes.join(', ')}`);
      updated++;
    } else {
      const err = await patchRes.text();
      console.error(`  ✗ ${slug}: ${patchRes.status} ${err.slice(0, 200)}`);
      errors++;
    }
  }

  console.log(`\n═══ Done! Updated: ${updated}, Errors: ${errors} ═══`);
}

main().catch(console.error);
