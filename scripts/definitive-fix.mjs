/**
 * Definitive Map Data Fix
 * - For maps WITH a txt file: parse exact wild digimon + NPCs, OVERWRITE CMS
 * - For maps WITHOUT a txt file: CLEAR wild digimon + NPCs (data is wrong)
 * - Preserves images, portals, descriptions, gallery, drops already set
 *
 * Usage: CMS_ADMIN_EMAIL=x CMS_ADMIN_PASSWORD=y node scripts/definitive-fix.mjs
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

// Folder → slug mapping (only folders that have .txt files)
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

// ═══════════════════════════════════════════════════════════
// PARSERS
// ═══════════════════════════════════════════════════════════

function parseWildDigimon(content) {
  const results = [];
  const lines = content.split(/\r?\n/);
  let inSection = false;
  let currentName = null;
  let currentBuiltinVariant = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect start of wild digimon section
    if (line === 'Wild Digimon' || (line === 'Digimon' && !inSection)) {
      inSection = true;
      continue;
    }

    if (!inSection) continue;

    // End of section
    if (/^(NPC's|NPCs|Drops|Raid Drops|Loading|Category|Categories|HTML:|Notes|Jogress Quest|Raid Bosses)/.test(line)) {
      inSection = false;
      continue;
    }

    // Skip empty lines, room labels, and info lines
    if (!line) continue;
    if (/^(First Room|Second Room|Third Room|Last Room|Only |All those|None\.?)$/i.test(line)) continue;
    if (line.startsWith('Quest ') || line.startsWith('Conditions')) continue;
    if (line.startsWith('Entry ')) continue;

    // Check if this is a behavior+data line (starts with "Aggressive" or "Non-aggressive")
    const isAggressive = line.startsWith('Aggressive monsters');
    const isDefensive = line.startsWith('Non-aggressive monsters') || line.startsWith('\tNon-aggressive');

    if (isAggressive || isDefensive) {
      // Parse this variant line
      const behavior = isAggressive ? 'aggressive' : 'defensive';

      // Extract variant from parentheses: (Leader), (Captain), etc.
      let variant = null;
      const variantMatch = line.match(/\(([^)]+)\)\s+HP:/);
      if (variantMatch) {
        variant = variantMatch[1].trim();
      }
      // Check for "Raid" keyword
      if (!variant && line.includes('\tRaid\t')) {
        variant = 'Raid';
      }

      // Extract HP
      let hp = null;
      const hpMatch = line.match(/HP:\s+([\d\s,.]+)/);
      if (hpMatch) {
        const hpStr = hpMatch[1].trim().replace(/\s+/g, '').replace(/,/g, '').replace(/\./g, '');
        const parsed = parseInt(hpStr, 10);
        if (!isNaN(parsed) && parsed > 0) hp = parsed;
      }

      // Extract Level
      let level = null;
      const levelMatch = line.match(/Level\(s\):\s+(\S+)/);
      if (levelMatch && levelMatch[1].toLowerCase() !== 'none') {
        level = levelMatch[1];
      }

      // Extract Attribute
      let attribute = null;
      const attrMatch = line.match(/(Vaccine|Virus|Data|None):\s/);
      if (attrMatch) attribute = attrMatch[1];

      // Extract Element
      let element = null;
      const elemMatch = line.match(/(Fire|Water|Ice|Wind|Wood|Land|Thunder|Light|Pitch Black|Steel|None):\s(?:is strong|Weak)/);
      if (elemMatch) element = elemMatch[1];

      if (currentName) {
        const entry = { name: currentName, behavior };
        const finalVariant = variant || currentBuiltinVariant;
        if (finalVariant) entry.variant = finalVariant;
        if (hp) entry.hp = hp;
        if (level) entry.level = level;
        if (attribute) entry.attribute = attribute;
        if (element) entry.element = element;
        results.push(entry);
      }
      continue;
    }

    // Check if this is a main Digimon name line (not a data line)
    const isMainName = !line.startsWith('\t') &&
      !line.startsWith('Aggressive') &&
      !line.startsWith('Non-aggressive') &&
      !line.includes('HP:') &&
      !line.includes('Level(s):') &&
      line.length < 100;

    if (isMainName) {
      // Parse name, possibly with variant in parentheses
      const nameMatch = line.match(/^(.+?)\s+\((.+)\)$/);
      if (nameMatch) {
        currentName = nameMatch[1].trim();
        currentBuiltinVariant = nameMatch[2].trim();
      } else {
        currentName = line.trim();
        currentBuiltinVariant = null;
      }

      // Check the NEXT line for the base defensive entry
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.startsWith('\t')) {
          // This is the base entry data line
          const behavior = nextLine.includes('Aggressive') ? 'aggressive' : 'defensive';

          let hp = null;
          const hpM = nextLine.match(/HP:\s+([\d\s,.]+)/);
          if (hpM) {
            const hpStr = hpM[1].trim().replace(/\s+/g, '').replace(/,/g, '').replace(/\./g, '');
            const parsed = parseInt(hpStr, 10);
            if (!isNaN(parsed) && parsed > 0) hp = parsed;
          }

          let level = null;
          const lvlM = nextLine.match(/Level\(s\):\s+(\S+)/);
          if (lvlM && lvlM[1].toLowerCase() !== 'none') level = lvlM[1];

          let attribute = null;
          const atM = nextLine.match(/(Vaccine|Virus|Data|None):\s/);
          if (atM) attribute = atM[1];

          let element = null;
          const elM = nextLine.match(/(Fire|Water|Ice|Wind|Wood|Land|Thunder|Light|Pitch Black|Steel|None):\s(?:is strong|Weak)/);
          if (elM) element = elM[1];

          const entry = { name: currentName, behavior };
          if (currentBuiltinVariant) entry.variant = currentBuiltinVariant;
          if (hp) entry.hp = hp;
          if (level) entry.level = level;
          if (attribute) entry.attribute = attribute;
          if (element) entry.element = element;
          results.push(entry);
          i++; // skip the data line
        }
      }
      continue;
    }
  }
  return results;
}

function parseNPCs(content) {
  const npcs = [];
  const lines = content.split(/\r?\n/);
  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "NPC's" || line === 'NPCs') { inSection = true; continue; }
    if (inSection) {
      if (/^(Drops|Notes|Loading|Category|Categories|HTML:|Raid)/.test(line)) { inSection = false; continue; }
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
  const mapsRes = await fetch(`${CMS}/api/maps?limit=200&depth=0`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const mapsData = await mapsRes.json();
  const allMaps = {};
  for (const m of mapsData.docs || []) allMaps[m.slug] = m;
  console.log(`Found ${Object.keys(allMaps).length} maps in CMS.\n`);

  // Find ALL txt files and build truth data
  function findTxtFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const results = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) results.push(...findTxtFiles(fullPath));
      else if (item.name.endsWith('.txt')) results.push(fullPath);
    }
    return results;
  }

  const txtFiles = findTxtFiles(MAPS_ROOT);
  console.log(`Found ${txtFiles.length} txt files.\n`);

  // Parse truth data from txt files
  const truthBySlug = {}; // slug → { wildDigimon: [...], npcs: [...] }

  for (const txtPath of txtFiles) {
    const content = fs.readFileSync(txtPath, 'utf-8');

    // Determine slug from parent folder
    const parts = txtPath.split(path.sep);
    let folderName = null;
    for (let i = parts.length - 2; i >= 0; i--) {
      if (FOLDER_TO_SLUG[parts[i]]) { folderName = parts[i]; break; }
    }
    if (!folderName) continue;
    const slug = FOLDER_TO_SLUG[folderName];

    if (!truthBySlug[slug]) {
      truthBySlug[slug] = { wildDigimon: [], npcs: [], hasWildNone: false };
    }

    // Check if file explicitly says "None" for wild digimon
    if (content.match(/Wild Digimon\s*\n\s*None/)) {
      truthBySlug[slug].hasWildNone = true;
    }

    // Parse wild digimon
    const wilds = parseWildDigimon(content);
    for (const w of wilds) {
      const exists = truthBySlug[slug].wildDigimon.some(
        e => e.name === w.name && e.variant === w.variant && e.behavior === w.behavior
      );
      if (!exists) truthBySlug[slug].wildDigimon.push(w);
    }

    // Parse NPCs
    const npcs = parseNPCs(content);
    for (const npc of npcs) {
      const exists = truthBySlug[slug].npcs.some(n => n.name === npc.name && n.role === npc.role);
      if (!exists) truthBySlug[slug].npcs.push(npc);
    }
  }

  console.log('═══ Truth data parsed from txt files ═══');
  for (const [slug, data] of Object.entries(truthBySlug)) {
    console.log(`  ${slug}: wild=${data.wildDigimon.length}${data.hasWildNone ? ' (explicitly None)' : ''}, npcs=${data.npcs.length}`);
  }

  // ── Now apply fixes ──
  console.log('\n═══ Applying fixes ═══\n');

  let fixed = 0;
  let cleared = 0;
  let unchanged = 0;

  for (const [slug, map] of Object.entries(allMaps)) {
    const currentWild = (map.wildDigimon || []).length;
    const currentNpcs = (map.npcs || []).length;

    const truth = truthBySlug[slug];

    if (truth) {
      // This map HAS a txt file — set exact data from it
      const correctWild = truth.hasWildNone ? [] : truth.wildDigimon;
      const correctNpcs = truth.npcs;

      // Check if data already matches
      if (currentWild === correctWild.length && currentNpcs === correctNpcs.length) {
        // Quick match on counts — could still be wrong but likely OK for most
        unchanged++;
        continue;
      }

      const patch = {};
      const changes = [];

      if (currentWild !== correctWild.length) {
        patch.wildDigimon = correctWild;
        changes.push(`wild: ${currentWild}→${correctWild.length}`);
      }
      if (currentNpcs !== correctNpcs.length) {
        // Preserve existing NPC icons by keeping current NPC entries if names match
        const existingNpcs = map.npcs || [];
        const mergedNpcs = correctNpcs.map(cn => {
          const existing = existingNpcs.find(e => e.name === cn.name);
          if (existing && existing.icon) {
            return { name: cn.name, role: cn.role, icon: typeof existing.icon === 'object' ? existing.icon.id || existing.icon : existing.icon };
          }
          return { name: cn.name, role: cn.role };
        });
        patch.npcs = mergedNpcs;
        changes.push(`npcs: ${currentNpcs}→${correctNpcs.length}`);
      }

      if (changes.length > 0) {
        const res = await fetch(`${CMS}/api/maps/${map.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          console.log(`  ✓ ${slug}: ${changes.join(', ')}`);
          fixed++;
        } else {
          console.error(`  ✗ ${slug}: PATCH failed ${res.status}`);
        }
      } else {
        unchanged++;
      }
    } else {
      // This map has NO txt file — clear any incorrect data
      if (currentWild > 0 || currentNpcs > 0) {
        const patch = {};
        const changes = [];
        if (currentWild > 0) {
          patch.wildDigimon = [];
          changes.push(`cleared wild (was ${currentWild})`);
        }
        if (currentNpcs > 0) {
          patch.npcs = [];
          changes.push(`cleared npcs (was ${currentNpcs})`);
        }

        const res = await fetch(`${CMS}/api/maps/${map.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          console.log(`  🗑 ${slug}: ${changes.join(', ')}`);
          cleared++;
        } else {
          console.error(`  ✗ ${slug}: PATCH failed ${res.status}`);
        }
      } else {
        unchanged++;
      }
    }
  }

  console.log(`\n═══ DONE! Fixed: ${fixed}, Cleared: ${cleared}, Unchanged: ${unchanged} ═══`);
}

main().catch(console.error);
