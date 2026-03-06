/**
 * import-digimon-batch.cjs
 * Reads all scraped Digimon ZIPs, extracts structured data, uploads images
 * to VPS, and upserts Digimon documents via mongosh.
 *
 * SKIPS: digivolvesFrom, digivolvesTo, jogress, evolutionLine fields
 *
 * Usage:  node import-digimon-batch.cjs              (all ZIPs)
 * Usage:  node import-digimon-batch.cjs agumon.zip   (single)
 */

const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const sizeOf = require('image-size');

const SCRAPES_DIR = 'C:\\Users\\Luk\\Desktop\\DMOKB\\Extension\\Scrapes\\Digimon';
const VPS = 'deploy@212.227.103.86';
const MEDIA_DIR = '/home/deploy/app/apps/cms/src/media';

function ssh(cmd) {
  return execSync(`ssh ${VPS} "${cmd.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 120000,
  }).trim();
}
function scp(localPath, remotePath) {
  execSync(`scp "${localPath}" ${VPS}:${remotePath}`, { encoding: 'utf8', timeout: 300000 });
}

// ── Slug generation ──
function toSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── Parse localized names from first table row ──
function parseNames(tables) {
  if (!tables || !tables[0] || !tables[0].rows || !tables[0].rows[0]) return {};
  const cell = tables[0].rows[0][0];
  const text = typeof cell === 'object' ? cell.text : cell;
  if (!text) return {};

  const names = {};
  // Katakana in parentheses: (アグモン) or (ブラックウォーグレイモン)
  const katMatch = text.match(/[（(]([ァ-ヾー]+(?:\s*[ァ-ヾー]*)*)[）)]/);
  if (katMatch) names.katakana = katMatch[1].trim();

  // Korean: Korean name: 아구몬
  const koMatch = text.match(/Korean name:\s*([^\n]+)/i);
  if (koMatch) names.korean = koMatch[1].trim();

  // Chinese: Chinese name: 亞古獸
  const zhMatch = text.match(/Chinese name:\s*([^\n]+)/i);
  if (zhMatch) names.chinese = zhMatch[1].trim();

  // Thai: Thai name: อากูมอน
  const thMatch = text.match(/Thai name:\s*([^\n]+)/i);
  if (thMatch) names.thai = thMatch[1].trim();

  // Japanese romanji from italic in HTML if present
  const jpMatch = text.match(/[（(].*?([A-Za-z][A-Za-z\s]+)[）)]/);
  // Skip — katakana is the main Japanese name

  return names;
}

// ── Parse stats from stats table ──
function parseStats(tables) {
  // Find table with headers like ["Digimon Stats", "Base  Value"]
  const statsTable = tables?.find(t =>
    t.headers?.some(h => (typeof h === 'string' ? h : h.text || h.label || '').toLowerCase().includes('digimon stats'))
  );
  if (!statsTable) return null;

  const stats = {};
  const statMap = {
    'health': 'hp', 'hp': 'hp',
    'digi-soul': 'ds', 'ds': 'ds',
    'attack': 'at', 'at': 'at',
    'attack speed': 'as', 'as': 'as',
    'critical': 'ct', 'ct': 'ct',
    'hit rate': 'ht', 'ht': 'ht',
    'defense': 'de', 'de': 'de',
    'evade': 'ev', 'ev': 'ev',
  };

  for (const row of (statsTable.rows || [])) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const label = ((typeof row[1] === 'object' ? row[1].text : row[1]) || '').toLowerCase().trim();
    const value = (typeof row[2] === 'object' ? row[2].text : row[2]) || (typeof row[1] === 'object' ? row[1].text : row[1]) || '';

    for (const [key, field] of Object.entries(statMap)) {
      if (label.includes(key)) {
        // Parse numeric value (strip % and commas)
        const num = parseFloat(value.replace(/[,%]/g, ''));
        if (!isNaN(num)) stats[field] = num;
        break;
      }
    }
  }
  return Object.keys(stats).length > 0 ? stats : null;
}

// ── Parse skills from skill table ──
function parseSkills(tables) {
  // Find table with headers that include "Attack" and level columns
  const skillTable = tables?.find(t =>
    t.headers?.some(h => {
      const text = typeof h === 'string' ? h : (h.text || h.label || '');
      return text === 'Attack' || text.includes('Lv.');
    })
  );
  if (!skillTable) return [];

  const skills = [];
  for (const row of (skillTable.rows || [])) {
    if (!Array.isArray(row) || row.length < 3) continue;
    // Column 0 = icon, Column 1 = skill name, Columns 2+ = damage per level
    const name = ((typeof row[1] === 'object' ? row[1].text : row[1]) || '').trim();
    if (!name) continue;

    // Get icon URL from first cell
    let iconUrl = null;
    if (typeof row[0] === 'object' && row[0].images?.length) {
      iconUrl = row[0].images[0].src;
    }

    // Collect damage per level
    const damages = [];
    for (let i = 2; i < row.length; i++) {
      const val = (typeof row[i] === 'object' ? row[i].text : row[i]) || '';
      const num = parseInt(val.replace(/,/g, ''));
      if (!isNaN(num)) damages.push(num);
    }

    skills.push({
      name,
      type: 'Attack',
      iconUrl,
      damagePerLevel: damages.length > 0 ? damages.join(', ') : null,
    });
  }
  return skills;
}

// ── Parse infobox fields ──
function parseInfobox(data) {
  const fields = data.infobox?.fields || {};
  const result = {};

  // Form
  if (fields['Form']) result.form = fields['Form'].trim();

  // Attribute
  if (fields['Attribute']) result.attribute = fields['Attribute'].trim();

  // Element
  if (fields['Elemental Attribute']) result.element = fields['Elemental Attribute'].trim();

  // Type
  if (fields['Type']) result.type = fields['Type'].trim();

  // Families
  if (fields['Families']) {
    // These are concatenated without delimiters, need to parse known family names
    const knownFamilies = [
      'Nature Spirits', 'Deep Savers', 'Nightmare Soldiers', 'Wind Guardians',
      'Metal Empire', 'Virus Busters', "Dragon's Roar", 'Jungle Troopers',
      'Dark Area', 'Unknown',
    ];
    const famText = fields['Families'];
    result.families = knownFamilies.filter(f => famText.includes(f));
  }

  // Attacker type from infobox table
  if (data.tables?.[0]) {
    const infoTable = data.tables[0];
    for (const row of (infoTable.rows || [])) {
      if (!Array.isArray(row)) continue;
      const label = ((typeof row[0] === 'object' ? row[0].text : row[0]) || '').trim();
      if (label.includes('Attacker Type')) {
        // The value might be in images or text
        const val = ((typeof row[1] === 'object' ? row[1].text : row[1]) || '').trim();
        if (val) {
          // Map common values
          const attackerMap = {
            'quick attacker': 'Quick Attacker', 'short attacker': 'Short Attacker',
            'near attacker': 'Near Attacker', 'defender': 'Defender',
          };
          result.attackerType = attackerMap[val.toLowerCase()] || val;
        }
        // Check images for attacker type icon
        if (!result.attackerType && typeof row[1] === 'object' && row[1].images?.length) {
          const imgSrc = row[1].images[0].src || '';
          if (imgSrc.includes('Quick_Attacker')) result.attackerType = 'Quick Attacker';
          else if (imgSrc.includes('Short_Attacker')) result.attackerType = 'Short Attacker';
          else if (imgSrc.includes('Near_Attacker')) result.attackerType = 'Near Attacker';
          else if (imgSrc.includes('Defender')) result.attackerType = 'Defender';
        }
        break;
      }
    }
  }

  // Rank from infobox images (e.g. SS+.png, A+.png)
  if (data.infobox?.images) {
    for (const img of data.infobox.images) {
      if (img.context === 'Rank' || (img.src || '').match(/\/(S|SS|SSS|A|N|U)\+?\.png/i)) {
        const m = (img.src || '').match(/\/([^/]+)\.png$/i);
        if (m) {
          const raw = decodeURIComponent(m[1]).replace(/%2B/g, '+').replace(/_/g, ' ');
          // Normalize rank
          const rankMap = { 'SS+': 'SS+', 'SS': 'SS', 'SSS+': 'SSS+', 'SSS': 'SSS', 'S+': 'S+', 'S': 'S', 'A+': 'A+', 'A': 'A', 'N': 'N', 'U+': 'U+', 'U': 'U' };
          result.rank = rankMap[raw] || raw;
        }
      }
    }
  }

  // Can be ridden
  if (fields['Can be ridden']) {
    const rideable = fields['Can be ridden'].toLowerCase();
    result.canBeRidden = rideable.includes('yes');
    // Extract ride speed if present
    const speedMatch = fields['Can be ridden'].match(/(\d+)\s*%/);
    if (speedMatch) result.rideSpeed = parseInt(speedMatch[1]);
  }

  // Can be hatched
  if (fields['Can be hatched']) {
    result.canBeHatched = fields['Can be hatched'].toLowerCase().includes('yes');
  }

  // Available
  if (fields['Available']) {
    result.available = fields['Available'].toLowerCase().includes('yes');
  }

  // Location
  if (fields['Location'] && fields['Location'] !== 'Not available') {
    result.location = fields['Location'].trim();
  }

  // Unlocked at level
  if (fields['Unlocked at level']) {
    const lvl = parseInt(fields['Unlocked at level']);
    if (!isNaN(lvl)) result.unlockedAtLevel = lvl;
  }

  // Required to evolve
  if (fields['Required to evolve']) {
    result.requiredToEvolve = fields['Required to evolve'].trim();
  }

  // Unlocked with
  if (fields['Unlocked with']) {
    result.unlockedWithItem = fields['Unlocked with'].trim();
  }

  return result;
}

// ── Extract introduction text ──
function extractIntro(data) {
  const intro = (data.sections || []).find(s => s.heading === '(Introduction)');
  return intro?.text?.trim() || '';
}

// ── Find main image from infobox ──
function findMainImage(data) {
  if (data.infobox?.images?.length) {
    const header = data.infobox.images.find(i => i.context === 'header');
    if (header) return header;
    return data.infobox.images[0];
  }
  if (data.images?.length) return data.images[0];
  return null;
}

// ── Process one ZIP ──
function processZip(zipPath) {
  const filename = path.basename(zipPath);
  const zip = new AdmZip(zipPath);
  const jsonEntry = zip.getEntries().find(e => e.entryName.endsWith('.json'));
  if (!jsonEntry) { console.log(`  ⚠ ${filename}: No JSON`); return null; }

  const data = JSON.parse(jsonEntry.getData().toString('utf8'));
  const name = data.title || filename.replace('.zip', '');
  const slug = toSlug(name);
  const infobox = parseInfobox(data);
  const names = parseNames(data.tables);
  const stats = parseStats(data.tables);
  const skills = parseSkills(data.tables);
  const introduction = extractIntro(data);
  const mainImg = findMainImage(data);

  console.log(`  ${slug}: "${name}" form=${infobox.form||'?'} attr=${infobox.attribute||'?'} elem=${infobox.element||'?'} rank=${infobox.rank||'?'} skills=${skills.length} stats=${stats ? Object.keys(stats).length : 0}`);

  return {
    name, slug, infobox, names, stats, skills, introduction,
    mainImg, data, zip, filename,
  };
}

// ── Upload images from ZIP to VPS ──
function uploadImages(zip, slug) {
  const imgEntries = zip.getEntries().filter(e =>
    e.entryName.startsWith('images/') && !e.isDirectory && e.header.size > 0
  );
  if (imgEntries.length === 0) return 0;

  const tmpLocal = path.join(require('os').tmpdir(), 'digi-import', slug);
  if (!fs.existsSync(tmpLocal)) fs.mkdirSync(tmpLocal, { recursive: true });

  for (const entry of imgEntries) {
    const fn = path.basename(entry.entryName);
    fs.writeFileSync(path.join(tmpLocal, fn), entry.getData());
  }

  const remoteTmp = `/tmp/digi-import-${Date.now()}`;
  ssh(`mkdir -p ${remoteTmp}`);
  execSync(`scp "${path.join(tmpLocal, '*')}" ${VPS}:${remoteTmp}/`, {
    encoding: 'utf8', timeout: 300000,
  });
  ssh(`cp ${remoteTmp}/* ${MEDIA_DIR}/ 2>/dev/null || true`);
  ssh(`rm -rf ${remoteTmp}`);

  // Cleanup local
  fs.rmSync(tmpLocal, { recursive: true, force: true });
  return imgEntries.length;
}

// ── Generate mongosh upsert for one Digimon ──
function generateDigimonUpsert(d) {
  const ib = d.infobox;
  const safe = (s) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');

  let setFields = '';
  setFields += `    name: '${safe(d.name)}',\n`;
  setFields += `    published: true,\n`;

  // Core fields
  if (ib.form) setFields += `    form: '${safe(ib.form)}',\n`;
  if (ib.attribute) setFields += `    attribute: '${safe(ib.attribute)}',\n`;
  if (ib.element) setFields += `    element: '${safe(ib.element)}',\n`;
  if (ib.type) setFields += `    type: '${safe(ib.type)}',\n`;
  if (ib.attackerType) setFields += `    attackerType: '${safe(ib.attackerType)}',\n`;
  if (ib.rank) setFields += `    rank: '${safe(ib.rank)}',\n`;
  if (ib.families?.length) {
    setFields += `    families: [${ib.families.map(f => `'${safe(f)}'`).join(', ')}],\n`;
  }

  // Introduction
  if (d.introduction) setFields += `    introduction: '${safe(d.introduction)}',\n`;

  // Names
  if (Object.keys(d.names).length > 0) {
    setFields += `    names: {\n`;
    if (d.names.katakana) setFields += `      katakana: '${safe(d.names.katakana)}',\n`;
    if (d.names.korean) setFields += `      korean: '${safe(d.names.korean)}',\n`;
    if (d.names.chinese) setFields += `      chinese: '${safe(d.names.chinese)}',\n`;
    if (d.names.thai) setFields += `      thai: '${safe(d.names.thai)}',\n`;
    setFields += `    },\n`;
  }

  // Stats
  if (d.stats) {
    setFields += `    stats: {\n`;
    for (const [k, v] of Object.entries(d.stats)) {
      setFields += `      ${k}: ${v},\n`;
    }
    setFields += `    },\n`;
  }

  // Skills
  if (d.skills.length > 0) {
    setFields += `    skills: [\n`;
    for (const sk of d.skills) {
      setFields += `      { name: '${safe(sk.name)}', type: '${sk.type}'`;
      if (sk.damagePerLevel) setFields += `, damagePerLevel: '${safe(sk.damagePerLevel)}'`;
      setFields += ` },\n`;
    }
    setFields += `    ],\n`;
  }

  // Availability
  if (ib.canBeRidden !== undefined) {
    setFields += `    rideability: { canBeRidden: ${ib.canBeRidden}`;
    if (ib.rideSpeed) setFields += `, rideSpeed: ${ib.rideSpeed}`;
    setFields += ` },\n`;
  }
  if (ib.canBeHatched !== undefined || ib.available !== undefined) {
    setFields += `    availability: {`;
    if (ib.canBeHatched !== undefined) setFields += ` canBeHatched: ${ib.canBeHatched},`;
    if (ib.available !== undefined) setFields += ` available: ${ib.available},`;
    setFields += ` },\n`;
  }
  if (ib.unlockedAtLevel) setFields += `    unlockedAtLevel: ${ib.unlockedAtLevel},\n`;
  if (ib.unlockedWithItem) setFields += `    unlockedWithItem: '${safe(ib.unlockedWithItem)}',\n`;
  if (ib.requiredToEvolve) setFields += `    requiredToEvolve: '${safe(ib.requiredToEvolve)}',\n`;
  if (ib.location) setFields += `    obtain: '${safe('Location: ' + ib.location)}',\n`;

  setFields += `    updatedAt: new Date().toISOString(),\n`;

  return setFields;
}

// ── Main ──
async function main() {
  const specificFile = process.argv[2];
  let zipFiles;
  if (specificFile) {
    zipFiles = [path.resolve(SCRAPES_DIR, specificFile)];
  } else {
    zipFiles = fs.readdirSync(SCRAPES_DIR)
      .filter(f => f.endsWith('.zip'))
      .map(f => path.resolve(SCRAPES_DIR, f));
  }

  console.log(`Found ${zipFiles.length} Digimon ZIPs\n`);

  // Phase 1: Parse all (deduplicate by slug, keep last)
  const digimonMap = new Map();
  for (const zp of zipFiles) {
    const result = processZip(zp);
    if (result) digimonMap.set(result.slug, result);
  }
  const digimons = [...digimonMap.values()];
  console.log(`\nParsed ${digimons.length} unique Digimon\n`);

  // Phase 2: Upload images
  console.log('Phase 2: Uploading images...');
  const tmpBase = path.join(require('os').tmpdir(), 'digi-import');
  if (fs.existsSync(tmpBase)) fs.rmSync(tmpBase, { recursive: true });

  let totalImages = 0;
  for (const d of digimons) {
    const count = uploadImages(d.zip, d.slug);
    if (count > 0) {
      console.log(`  ${d.slug}: ${count} images`);
      totalImages += count;
    }
  }
  console.log(`Total images: ${totalImages}\n`);

  // Phase 3: Generate mongosh script
  console.log('Phase 3: Generating mongosh script...');
  let script = 'use("dmo-kb");\n\n';

  let varIdx = 0;
  for (const d of digimons) {
    varIdx++;
    const varName = 'v' + varIdx;
    const safeSlug = d.slug.replace(/'/g, "\\'");
    const setFields = generateDigimonUpsert(d);

    script += `// --- ${d.name} ---\n`;
    script += `let ex_${varName} = db.digimons.findOne({slug: '${safeSlug}'});\n`;
    script += `if (ex_${varName}) {\n`;
    // Update but preserve existing digivolution fields
    script += `  db.digimons.updateOne({slug: '${safeSlug}'}, {$set: {\n`;
    script += setFields;
    script += `  }});\n`;
    script += `  print('UPDATED: ${safeSlug}');\n`;
    script += `} else {\n`;
    script += `  db.digimons.insertOne({\n`;
    script += `    slug: '${safeSlug}',\n`;
    script += setFields;
    script += `    createdAt: new Date().toISOString(),\n`;
    script += `    __v: 0\n`;
    script += `  });\n`;
    script += `  print('CREATED: ${safeSlug}');\n`;
    script += `}\n\n`;
  }

  const scriptPath = path.join(require('os').tmpdir(), 'import-digimon-batch.js');
  fs.writeFileSync(scriptPath, script);
  console.log(`Script: ${scriptPath} (${(script.length / 1024).toFixed(0)}KB)`);

  scp(scriptPath, '/tmp/import-digimon-batch.js');
  console.log('Executing on VPS...');
  const output = ssh('mongosh --quiet /tmp/import-digimon-batch.js');
  console.log('\n' + output);

  console.log(`\n✅ Done! ${digimons.length} Digimon imported.`);
}

main().catch(e => { console.error(e); process.exit(1); });
