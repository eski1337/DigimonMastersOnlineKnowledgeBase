/**
 * Parse all wiki dump .txt files from Maps/ directory and generate
 * a JSON file with exact wild Digimon data (HP, levels, etc.)
 *
 * Usage: node scripts/parse-wiki-data.mjs
 * Output: scripts/wild-digimon-data.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MAPS_DIR = path.join(ROOT, 'Maps');

// Map file paths to CMS slugs
const FILE_TO_SLUG = {
  // Western Area
  'Western Area/2/Dark Tower Wasteland/Dark Tower Wasteland.txt': 'dark-tower-wasteland',
  'Western Area/2/Digimon Maze B1/Digimon Maze B1.txt': 'digimon-maze-b1',
  'Western Area/2/Digimon Maze B2/DigimonMazeB2.txt': 'digimon-maze-b2',
  'Western Area/2/Digimon Maze Entrance/Digimon Maze Entrance.txt': 'digimon-maze-entrance',
  'Western Area/2/Digimon Maze F1/Digimon Maze F1.txt': 'digimon-maze-f1',
  'Western Area/2/Digimon Maze F2/Digimon Maze F2.txt': 'digimon-maze-f2',
  'Western Area/2/Digimon Maze F3/Digimon Maze F3.txt': 'digimon-maze-f3',
  'Western Area/2/Digimon Maze F4/Digimon Maze F4.txt': 'digimon-maze-f4',
  'Western Area/2/Western Area West/WesternAreaWest.txt': 'western-area-west',
  // File Island
  'File Island/Ancient Ruins of Secret/Ancient Ruins of Secret.txt': 'lost-historic-site',
  'File Island/Crack of Devimon/Crack of Devimon.txt': 'crack-of-devimon',
  'File Island/File Island Waterfront/File Island Waterfront.txt': 'file-island-waterfront',
  'File Island/Infinite Mountain/Infinite Mountain.txt': 'infinite-mountain',
  'File Island/Infinite Mountain Dungeon/Infinite Mountain Dungeon.txt': 'infinite-mountain-dungeon',
  'File Island/Lost Historic Site/Lost Historic Site.txt': 'lost-historic-site',
  'File Island/Silent Forest/Silent Forest.txt': 'silent-forest',
  'File Island/Silver Lake/SilverLake.txt': 'silver-lake',
  'File Island/Village of Beginnings/Village of Beginnings.txt': 'village-of-the-beginning',
  // Server Continent
  'Server Continent/Datamon Maze/Datamon Maze (Easy).txt': 'datamon-maze',
  'Server Continent/Datamon Maze/Datamon Maze (Hard).txt': 'datamon-maze-hard',
  'Server Continent/Datamon Maze/Datamon Maze (Normal).txt': 'datamon-maze-normal',
  'Server Continent/Server Continent Canyon/Server Continent Canyon.txt': 'server-continent-canyon',
  'Server Continent/Server Continent Desert/Server Continent Desert.txt': 'server-continent-desert',
  'Server Continent/Server Continent Pyramid/Server Continent Pyramid.txt': 'server-continent-pyramid',
};

function parseAttribute(text) {
  if (!text) return '';
  const m = text.match(/^(Vaccine|Virus|Data|None)/);
  return m ? m[1] : '';
}

function parseElement(text) {
  if (!text) return '';
  const m = text.match(/^(Fire|Ice|Water|Wood|Land|Wind|Thunder|Light|Pitch Black|Steel|Neutral|None)/);
  return m ? m[1] : '';
}

function parseHP(text) {
  if (!text) return null;
  const cleaned = text.replace(/\s/g, '').replace(/,/g, '');
  if (cleaned.toLowerCase() === 'none' || cleaned === '' || cleaned === '?') return null;
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function parseLevel(text) {
  if (!text) return '';
  const t = text.trim();
  if (t.toLowerCase() === 'none' || t === '') return '';
  return t;
}

function parseWildDigimon(content) {
  const lines = content.split('\n');
  const results = [];

  // Find the "Wild Digimon" section
  let inSection = false;
  let currentName = null;
  let currentBuiltinVariant = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === 'Wild Digimon' || (line === 'Digimon' && !inSection)) {
      inSection = true;
      i++;
      continue;
    }

    if (!inSection) {
      i++;
      continue;
    }

    // End of wild digimon section
    if (line.startsWith("NPC's") || line.startsWith('NPC') || line === 'Category: Maps' ||
        line.startsWith('This page was last edited') || line === 'Drops' ||
        line.startsWith('Categories:') || line === 'Loading Screen') {
      break;
    }

    // Skip room labels like "First Room", "Second Room", etc.
    if (line.match(/^(First|Second|Third|Last|Boss)\s+(Room|Floor|Stage)/i) ||
        line === 'Conditions of Participation') {
      i++;
      continue;
    }

    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    const rawLine = lines[i];

    // Check if this is a main Digimon name line (no tab prefix, no behavior text)
    const isMainName = !rawLine.startsWith('\t') &&
      !rawLine.startsWith('Aggressive') &&
      !rawLine.startsWith('Non-aggressive') &&
      !line.startsWith('HP:') &&
      !line.startsWith('Level') &&
      line.length > 0 &&
      !line.startsWith('Category') &&
      !line.startsWith('Categories') &&
      !line.match(/^This page/) &&
      !line.match(/^(First|Second|Third|Last|Boss)\s+(Room|Floor|Stage)/i);

    if (isMainName && !line.includes('HP:') && !line.includes('Level(s):')) {
      // Handle names with parenthetical like "Ogremon (Patroller)"
      // Extract base name and built-in variant
      const nameMatch = line.match(/^(.+?)\s+\((.+)\)$/);
      if (nameMatch) {
        currentName = nameMatch[1].trim();
        currentBuiltinVariant = nameMatch[2].trim();
      } else {
        currentName = line;
        currentBuiltinVariant = null;
      }
      i++;
      continue;
    }

    // This is a data line (either main entry or variant)
    if (currentName && (line.includes('HP:') || line.includes('Level(s):'))) {
      const isAggressive = line.includes('Aggressive monsters attack you first');
      const isDefensive = line.includes('Non-aggressive monsters do not attack you first');

      // Extract fields using tab splits
      const parts = rawLine.split('\t').map(p => p.trim()).filter(Boolean);

      let variant = '';
      let hp = null;
      let level = '';
      let attribute = '';
      let element = '';

      for (let j = 0; j < parts.length; j++) {
        const p = parts[j];

        if (p === 'HP:') {
          hp = parseHP(parts[j + 1] || '');
        } else if (p === 'Level(s):') {
          level = parseLevel(parts[j + 1] || '');
        } else if (p.match(/^(Vaccine|Virus|Data|None):/)) {
          attribute = parseAttribute(p);
        } else if (p.match(/^(Fire|Ice|Water|Wood|Land|Wind|Thunder|Light|Pitch Black|Steel|Neutral):/i) ||
                   p.match(/^(Fire|Ice|Water|Wood|Land|Wind|Thunder|Light|Pitch Black|Steel|Neutral)\b/i) &&
                   p.includes('is strong against')) {
          element = parseElement(p);
        } else if (p.startsWith('(') && p.endsWith(')')) {
          variant = p.slice(1, -1);
        } else if (!p.startsWith('Aggressive') && !p.startsWith('Non-aggressive') && !p.startsWith('HP') && !p.startsWith('Level')) {
          // Could be a "Dark" variant name like "DarkVeemon"
          if (p.startsWith('Dark') && p !== 'Data' && !p.includes(':') && !p.includes('Strong')) {
            variant = p;
          }
        }
      }

      const behavior = isAggressive ? 'aggressive' : 'defensive';

      // Use builtin variant from name line if no inline variant was found
      const finalVariant = variant || currentBuiltinVariant || '';

      const entry = {
        name: currentName,
        behavior,
        level,
      };
      if (finalVariant) entry.variant = finalVariant;
      if (hp !== null) entry.hp = hp;
      if (attribute) entry.attribute = attribute;
      if (element) entry.element = element;

      // For the first entry of a digimon (the main line with attribute/element info),
      // check if attribute/element were on this line
      if (!attribute && results.length > 0) {
        // Try to inherit from the base entry of same name
        const base = results.find(r => r.name === currentName && r.attribute);
        if (base) entry.attribute = base.attribute;
      }
      if (!element && results.length > 0) {
        const base = results.find(r => r.name === currentName && r.element);
        if (base) entry.element = base.element;
      }

      results.push(entry);
    }

    i++;
  }

  return results;
}

// Main
const output = {};
let totalEntries = 0;

for (const [relPath, slug] of Object.entries(FILE_TO_SLUG)) {
  const fullPath = path.join(MAPS_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  SKIP: ${relPath} (file not found)`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const digimon = parseWildDigimon(content);

  if (digimon.length > 0) {
    // If slug already exists (e.g. lost-historic-site mapped twice), merge
    if (output[slug]) {
      // Don't overwrite, just skip duplicate
      console.log(`  SKIP: ${relPath} → ${slug} (already have ${output[slug].length} entries)`);
    } else {
      output[slug] = digimon;
      totalEntries += digimon.length;
      console.log(`  ✓ ${slug}: ${digimon.length} entries`);
    }
  } else {
    console.log(`  EMPTY: ${relPath} → ${slug}`);
  }
}

const outPath = path.join(__dirname, 'wild-digimon-data.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nWrote ${Object.keys(output).length} maps, ${totalEntries} total entries → ${outPath}`);
