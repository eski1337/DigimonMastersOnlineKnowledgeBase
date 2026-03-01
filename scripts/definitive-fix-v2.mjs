/**
 * Definitive Map Data Fix v2
 * - Handles ALL folders including newly added Western Area, Yokohama, DATS
 * - Parses both .txt and .html files
 * - For maps WITH data files: parse exact wild digimon + NPCs, OVERWRITE CMS
 * - For maps WITHOUT data files: CLEAR wild digimon + NPCs
 * - Also parses descriptions from txt files
 *
 * Usage: CMS_ADMIN_EMAIL=x CMS_ADMIN_PASSWORD=y node scripts/definitive-fix-v2.mjs
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
// COMPLETE FOLDER → SLUG MAPPING
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
  'Digimon Farm': 'digimon-farm',
  'Digimon Maze B1': 'digimon-maze-b1',
  'Digimon Maze B2': 'digimon-maze-b2',
  'Digimon Maze Entrance': 'digimon-maze-entrance',
  'Digimon Maze F1': 'digimon-maze-f1',
  'Digimon Maze F2': 'digimon-maze-f2',
  'Digimon Maze F3': 'digimon-maze-f3',
  'Digimon Maze F4': 'digimon-maze-f4',
  'Ruined Historic': 'ruined-historic',
  'Western Area East': 'western-area-east',
  'Western Area Outskirts': 'western-area-outskirts',
  'Western Area West': 'western-area-west',
  'Western Village': 'western-village',
  'Wilderness Area': 'wilderness-area',
  'Wind Valley': 'wind-valley',
  // Yokohama
  'Oil Refinery-1': 'oil-refinery-1',
  'Oil Refinery-2': 'oil-refinery-2',
  'Oil Refinery-3': 'oil-refinery-3',
  'Yokohama East Village': 'yokohama-east-village',
  'Yokohama Village': 'yokohama-village',
  // DATS
  'DATS': 'dats-center',
};

// ═══════════════════════════════════════════════════════════
// TXT PARSERS — Tab-aware, handles all edge cases
// ═══════════════════════════════════════════════════════════

/**
 * Parse a data line (tab-delimited) into structured fields.
 * Handles: HP with spaces (758 775), HP=?, HP=none, Level=BOSS, Raid variant,
 * (Leader), (Dismantler), attribute None: Weak against all, etc.
 */
function parseDataFields(rawLine) {
  const parts = rawLine.split('\t').map(p => p.trim()).filter(Boolean);
  const result = { behavior: 'defensive', variant: null, hp: null, level: null, attribute: null, element: null };

  for (const part of parts) {
    // Behavior
    if (part.startsWith('Aggressive monsters')) result.behavior = 'aggressive';
    if (part.startsWith('Non-aggressive monsters')) result.behavior = 'defensive';

    // Variant in parens like (Leader), (Dismantler), (Sharp Horn) etc.
    const variantMatch = part.match(/^\((.+)\)$/);
    if (variantMatch) { result.variant = variantMatch[1].trim(); continue; }

    // Standalone variant keyword: "Raid"
    if (part === 'Raid') { result.variant = 'Raid'; continue; }

    // Attribute: "Vaccine: Strong against...", "None: Weak against all"
    const attrMatch = part.match(/^(Vaccine|Virus|Data|Unknown|None):\s/);
    if (attrMatch) { result.attribute = attrMatch[1]; continue; }

    // Element: "Fire: is strong against...", "Pitch Black: is strong..."
    const elemMatch = part.match(/^(Fire|Water|Ice|Wind|Wood|Land|Thunder|Light|Pitch Black|Steel):\s/);
    if (elemMatch) { result.element = elemMatch[1]; continue; }
  }

  // HP and Level are after "HP:" and "Level(s):" tab-separated fields
  const joined = rawLine;
  const hpMatch = joined.match(/HP:\t([^\t]+)/);
  if (hpMatch) {
    const hpRaw = hpMatch[1].trim();
    if (hpRaw !== '?' && hpRaw.toLowerCase() !== 'none') {
      const hpNum = parseInt(hpRaw.replace(/[\s,]/g, ''), 10);
      if (!isNaN(hpNum) && hpNum > 0) result.hp = hpNum;
    }
  }

  const lvlMatch = joined.match(/Level\(s\):\t([^\t\n]+)/);
  if (lvlMatch) {
    const lvlRaw = lvlMatch[1].trim();
    if (lvlRaw.toLowerCase() !== 'none' && lvlRaw !== '?') result.level = lvlRaw;
  }

  return result;
}

function parseWildDigimon(content) {
  const results = [];
  const lines = content.split(/\r?\n/);
  let inSection = false;
  let currentName = null;
  let currentBuiltinVariant = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Section start
    if (/^Wild Digimon(\[edit)?/i.test(trimmed) || (trimmed === 'Digimon' && !inSection)) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;

    // Section end markers
    if (/^(NPC'?s|Drops|Raid Drops|Loading Screen|Category|Categories|HTML:|Notes|Jogress|Raid Bosses|Quests|File Island|\[edit)/i.test(trimmed)) {
      inSection = false;
      continue;
    }

    if (!trimmed) continue;

    // Skip noise
    if (/^(First Room|Second Room|Third Room|Last Room|Only |All those|Quest |Conditions|Entry |The normal mode|Main Quests|\[edit)/i.test(trimmed)) continue;
    if (/^None\.?$/i.test(trimmed)) { inSection = false; continue; }

    // Is this a behavior/data line? (starts with Aggressive/Non-aggressive or has leading tab)
    const isBehaviorLine = trimmed.startsWith('Aggressive monsters') || trimmed.startsWith('Non-aggressive monsters');
    const isTabbed = raw.startsWith('\t');

    if (isBehaviorLine || (isTabbed && isBehaviorLine)) {
      // Parse data from this line
      const fields = parseDataFields(raw);

      if (currentName) {
        const entry = { name: currentName, behavior: fields.behavior };
        const v = fields.variant || currentBuiltinVariant;
        // Only use builtinVariant for the first entry line after a name
        if (fields.variant) entry.variant = fields.variant;
        else if (isTabbed && !results.some(r => r.name === currentName)) {
          // This is the base entry — use builtinVariant if present
          if (currentBuiltinVariant) entry.variant = currentBuiltinVariant;
        }
        if (fields.hp) entry.hp = fields.hp;
        if (fields.level) entry.level = fields.level;
        if (fields.attribute) entry.attribute = fields.attribute;
        if (fields.element) entry.element = fields.element;
        results.push(entry);
      }
      continue;
    }

    // Otherwise this might be a Digimon name line
    // Name lines: not tab-indented, no HP/Level, reasonably short
    if (!isTabbed && !trimmed.includes('HP:') && !trimmed.includes('Level(s):') && trimmed.length < 120) {
      // Check for built-in variant: "Arkadimon (Ultimate)" or "Cherubimon (White)"
      const nameMatch = trimmed.match(/^(.+?)\s+\((.+)\)$/);
      if (nameMatch) {
        currentName = nameMatch[1].trim();
        currentBuiltinVariant = nameMatch[2].trim();
      } else {
        currentName = trimmed.replace(/\[edit.*$/, '').trim();
        currentBuiltinVariant = null;
      }
    }
  }
  return results;
}

function parseNPCsFromTxt(content) {
  const npcs = [];
  const lines = content.split(/\r?\n/);
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Section start: "NPC's" or "NPCs" (possibly with [edit ...] suffix)
    if (/^NPC'?s(\[edit)?/i.test(trimmed)) { inSection = true; continue; }
    if (!inSection) continue;

    // Section end markers
    if (/^(Drops|Notes|Loading|Category|Categories|HTML:|Raid|Quests|File Island|\[edit)/i.test(trimmed)) {
      inSection = false; continue;
    }

    // Empty line — check if section continues
    if (!trimmed) {
      let nextNonEmpty = '';
      for (let j = i + 1; j < lines.length && j < i + 4; j++) {
        if (lines[j].trim()) { nextNonEmpty = lines[j].trim(); break; }
      }
      if (!nextNonEmpty || /^(Drops|Notes|Loading|Category|HTML:|Raid|Quests)/i.test(nextNonEmpty)) {
        inSection = false;
      }
      continue;
    }

    // Parse NPC line using tab-splitting
    const parts = raw.split('\t').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;

    let name = parts[0];
    let role = '';

    // Find role in angle brackets in any part
    for (const part of parts) {
      const roleMatch = part.match(/^<(.+)>$/);
      if (roleMatch) { role = roleMatch[1].trim(); break; }
    }

    // Clean up name
    name = name.replace(/\[edit.*$/, '').trim();

    // Skip junk lines
    const SKIP_PREFIXES = ['Category', 'Loading', 'HTML', 'This page', 'Privacy',
      'Powered', 'Search', 'Discussion', 'View history', 'Watch', 'Edit source',
      'Personal', 'Toggle', 'New pages', 'Talk to', 'You can', 'Digimon Masters',
      'Tools', 'Main', 'Recent', 'Help', 'Syntax', 'English', 'Read', 'Page'];
    if (!name || name.length < 2 || SKIP_PREFIXES.some(p => name.startsWith(p))) continue;

    // Deduplicate
    if (!npcs.some(n => n.name === name && n.role === role)) {
      npcs.push({ name, role });
    }
  }
  return npcs;
}

function parseDescriptionFromTxt(content) {
  const lines = content.split(/\r?\n/);
  const SKIP_PREFIXES = ['Digimon Masters', 'Search', 'Eski', 'Appearance', 'Alerts',
    'Notice', 'Watchlist', 'Personal', 'Main menu', 'Main page', 'Mercenary', 'Help',
    'Recent', 'New pages', 'Syntax', 'Switch', 'Toggle', 'Page', 'Discussion',
    'English', 'Read', 'Edit', 'Watch', 'Tools', 'Only ', 'You need', 'Contents'];
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const line = lines[i].trim();
    if (/^(Wild Digimon|NPC'?s)(\[|$)/i.test(line)) break;
    if (line && line.length > 20 && line.length < 500 && !SKIP_PREFIXES.some(p => line.startsWith(p))) {
      return line;
    }
  }
  return null;
}

function parseDropsFromTxt(content) {
  const drops = [];
  const lines = content.split(/\r?\n/);
  let inDrops = false;
  let inNotes = false;
  let currentMonster = '';

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Drops section
    if (/^(Drops|Raid Drops List|Raid Drops|Raid Drop)(\[edit)?/i.test(trimmed)) {
      inDrops = true; inNotes = false; continue;
    }
    // Notes section (can contain drop info like "Monochromon Sharp Horn drop Green Four-Leaf Clover")
    if (/^Notes(\[edit)?/i.test(trimmed)) {
      inDrops = false; inNotes = true; continue;
    }
    if (/^(Loading|Category|Categories|HTML:|NPC'?s|Quests|Wild Digimon)/i.test(trimmed)) {
      inDrops = false; inNotes = false; continue;
    }

    if (inDrops) {
      if (!trimmed) continue;
      const stripped = lines[i].replace(/^\t+/, '').trim();
      if (!stripped) continue;

      // Detect monster/source headers
      if (stripped.match(/Reward Box|Treasure Box/i)) { currentMonster = stripped; continue; }
      if (stripped.startsWith('Obtain ') || stripped.startsWith('All ')) continue;

      // Parse: "1x Item Name" or "1-3x Item Name"
      const itemMatch = stripped.match(/^(\d+(?:-\d+)?x?)\s+(.+)$/);
      if (itemMatch) {
        drops.push({ monster: currentMonster || 'Various', item: itemMatch[2].trim(), quantity: itemMatch[1] });
      } else if (stripped.length > 2 && !stripped.includes('defeated') && !stripped.includes('probability')) {
        const nextLine = (i + 1 < lines.length) ? lines[i + 1].replace(/^\t+/, '').trim() : '';
        if (nextLine.match(/^\d/) || nextLine.includes('Reward') || nextLine.includes('Box')) {
          currentMonster = stripped;
        }
      }
    }

    if (inNotes) {
      if (!trimmed) continue;
      // Parse notes like: "Monochromon Sharp Horn drop  Green Four-Leaf Clover."
      const noteDropMatch = trimmed.match(/^(.+?)\s+drop\s+(.+?)\.*$/i);
      if (noteDropMatch) {
        drops.push({ monster: noteDropMatch[1].trim(), item: noteDropMatch[2].trim() });
      }
      // Parse: "All Digimon in this map have a chance to drop  White Five-Leaf Clover"
      const allDropMatch = trimmed.match(/All Digimon.*drop\s+(.+?)(?:,|\.|which)/i);
      if (allDropMatch) {
        drops.push({ monster: 'All Digimon', item: allDropMatch[1].trim() });
      }
    }
  }
  return drops;
}

// ═══════════════════════════════════════════════════════════
// HTML PARSER (for DATS Center etc.)
// ═══════════════════════════════════════════════════════════

function parseNPCsFromHtml(htmlContent) {
  const npcs = [];
  let match;

  // Pattern 1: <td>NPC Name</td><td>&lt;Role&gt;</td>
  const npcPattern = /<td[^>]*>(?:<[^>]*>)*([^<]+?)(?:<\/[^>]*>)*\s*<\/td>\s*<td[^>]*>\s*&lt;(.+?)&gt;\s*<\/td>/g;
  while ((match = npcPattern.exec(htmlContent)) !== null) {
    const name = match[1].trim();
    const role = match[2].trim();
    if (name && name.length > 1 && !name.includes('icon') && !name.includes('Icon')) {
      npcs.push({ name, role });
    }
  }

  // Pattern 2: <a title="NPC">...</a> followed by role
  const linkNpcPattern = /<a[^>]*title="([^"]+)"[^>]*>[^<]*<\/a>\s*<\/td>\s*<td[^>]*>\s*&lt;(.+?)&gt;/g;
  while ((match = linkNpcPattern.exec(htmlContent)) !== null) {
    let name = match[1].trim().replace(/\s*\(page does not exist\)/g, '').trim();
    const role = match[2].trim();
    if (name && name.length > 1 && !npcs.some(n => n.name === name && n.role === role)) {
      npcs.push({ name, role });
    }
  }

  return npcs;
}

function hasWildDigimonNoneInHtml(htmlContent) {
  // Only match explicit "None" right after Wild Digimon heading
  return /<h2[^>]*>.*?Wild Digimon.*?<\/h2>\s*<p>\s*<i>None<\/i>/is.test(htmlContent);
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

  // Find all data files recursively
  function findDataFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const results = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        // Skip _files folders (HTML assets)
        if (item.name.endsWith('_files')) continue;
        results.push(...findDataFiles(fullPath));
      } else if (item.name.endsWith('.txt') || item.name.endsWith('.html')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const dataFiles = findDataFiles(MAPS_ROOT);
  console.log(`Found ${dataFiles.length} data files.\n`);

  // Build truth data per slug from all data files
  const truthBySlug = {};

  for (const filePath of dataFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const isHtml = fileName.endsWith('.html');

    // Determine slug from parent folder
    const parts = filePath.split(path.sep);
    let folderName = null;
    for (let i = parts.length - 2; i >= 0; i--) {
      if (FOLDER_TO_SLUG[parts[i]]) { folderName = parts[i]; break; }
    }
    if (!folderName) {
      // Skip HTML asset files and unrecognized folders
      continue;
    }
    const slug = FOLDER_TO_SLUG[folderName];

    if (!truthBySlug[slug]) {
      truthBySlug[slug] = { wildDigimon: [], npcs: [], hasWildNone: false, description: null, drops: [] };
    }

    if (isHtml) {
      // Parse NPCs from HTML
      const htmlNpcs = parseNPCsFromHtml(content);
      for (const npc of htmlNpcs) {
        if (!truthBySlug[slug].npcs.some(n => n.name === npc.name && n.role === npc.role)) {
          truthBySlug[slug].npcs.push(npc);
        }
      }
      if (hasWildDigimonNoneInHtml(content)) {
        truthBySlug[slug].hasWildNone = true;
      }
    } else {
      // Parse from txt (preferred — more structured)
      // Only check TEXT portion (before HTML: marker) for explicit "None" wild digimon
      const textPortion = content.split(/^HTML:$/m)[0];
      if (textPortion.match(/Wild Digimon\s*\r?\n\s*None\.?\s*$/mi)) {
        truthBySlug[slug].hasWildNone = true;
      }

      // Parse wild digimon (from text portion only)
      const wilds = parseWildDigimon(textPortion);
      for (const w of wilds) {
        const exists = truthBySlug[slug].wildDigimon.some(
          e => e.name === w.name && e.variant === w.variant && e.behavior === w.behavior
        );
        if (!exists) truthBySlug[slug].wildDigimon.push(w);
      }

      // If we found wild digimon, hasWildNone MUST be false
      if (truthBySlug[slug].wildDigimon.length > 0) {
        truthBySlug[slug].hasWildNone = false;
      }

      // Parse NPCs — txt NPCs take priority, replace any HTML NPCs
      const txtNpcs = parseNPCsFromTxt(textPortion);
      if (txtNpcs.length > 0) {
        // Replace existing (possibly from HTML) with more accurate txt data
        for (const npc of txtNpcs) {
          if (!truthBySlug[slug].npcs.some(n => n.name === npc.name && n.role === npc.role)) {
            truthBySlug[slug].npcs.push(npc);
          }
        }
      }

      // Parse description
      if (!truthBySlug[slug].description) {
        const desc = parseDescriptionFromTxt(textPortion);
        if (desc) truthBySlug[slug].description = desc;
      }

      // Parse drops
      const drops = parseDropsFromTxt(textPortion);
      for (const d of drops) {
        if (!truthBySlug[slug].drops.some(e => e.item === d.item && e.monster === d.monster)) {
          truthBySlug[slug].drops.push(d);
        }
      }
    }
  }

  // Final safety: if any slug has parsed wild digimon, hasWildNone must be false
  for (const [slug, data] of Object.entries(truthBySlug)) {
    if (data.wildDigimon.length > 0) data.hasWildNone = false;
  }

  console.log('═══ Truth data parsed ═══');
  for (const [slug, data] of Object.entries(truthBySlug).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${slug}: wild=${data.wildDigimon.length}${data.hasWildNone ? '(None)' : ''} npcs=${data.npcs.length} drops=${data.drops.length}${data.description ? ' +desc' : ''}`);
  }

  // Apply fixes
  console.log('\n═══ Applying fixes ═══\n');

  let fixed = 0;
  let cleared = 0;
  let unchanged = 0;

  for (const [slug, map] of Object.entries(allMaps)) {
    const currentWild = (map.wildDigimon || []).length;
    const currentNpcs = (map.npcs || []).length;
    const currentDrops = (map.drops || []).length;

    const truth = truthBySlug[slug];

    if (truth) {
      const correctWild = truth.hasWildNone ? [] : truth.wildDigimon;
      const correctNpcs = truth.npcs;
      const correctDrops = truth.drops;

      const patch = {};
      const changes = [];

      // Always overwrite wild digimon and NPCs from truth data
      if (currentWild !== correctWild.length || currentWild > 0) {
        // Deep compare by checking if names match
        const currentNames = (map.wildDigimon || []).map(w => `${w.name}|${w.variant || ''}|${w.behavior || ''}`).sort().join(',');
        const truthNames = correctWild.map(w => `${w.name}|${w.variant || ''}|${w.behavior || ''}`).sort().join(',');
        if (currentNames !== truthNames) {
          patch.wildDigimon = correctWild;
          changes.push(`wild: ${currentWild}→${correctWild.length}`);
        }
      }

      if (currentNpcs !== correctNpcs.length || currentNpcs > 0) {
        const currentNpcNames = (map.npcs || []).map(n => `${n.name}|${n.role || ''}`).sort().join(',');
        const truthNpcNames = correctNpcs.map(n => `${n.name}|${n.role || ''}`).sort().join(',');
        if (currentNpcNames !== truthNpcNames) {
          // Preserve existing NPC icons
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
      }

      // Update drops if we have them and they differ
      if (correctDrops.length > 0 && currentDrops !== correctDrops.length) {
        patch.drops = correctDrops;
        changes.push(`drops: ${currentDrops}→${correctDrops.length}`);
      }

      // Update description if we have one and map doesn't
      if (truth.description && !map.description) {
        patch.description = truth.description;
        changes.push('desc');
      }

      if (Object.keys(patch).length > 0) {
        const res = await fetch(`${CMS}/api/maps/${map.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          console.log(`  ✓ ${slug}: ${changes.join(', ')}`);
          fixed++;
        } else {
          const err = await res.text();
          console.error(`  ✗ ${slug}: PATCH failed ${res.status} ${err.slice(0, 100)}`);
        }
      } else {
        unchanged++;
      }
    } else {
      // No data file for this map — clear any incorrect data
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
