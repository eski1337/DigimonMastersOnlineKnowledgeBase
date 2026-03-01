#!/usr/bin/env node
/**
 * Import Digimon from markdown files into Payload CMS.
 * Parses the structured markdown format and upserts via REST API.
 * Usage: node import-from-md.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const CMS_URL = 'http://localhost:3001';
const OWNER_EMAIL = process.env.CMS_ADMIN_EMAIL;
const OWNER_PASS = process.env.CMS_ADMIN_PASSWORD;

// Valid enum values from the shared package
const VALID_FORMS = [
  'Fresh','In-Training','Rookie','Armor','Champion','Ultimate','Mega',
  'Burst Mode','Side Mega','Ultra','Jogress','Jogress Mega',
  'H-Hybrid','B-Hybrid','A-Hybrid','Z-Hybrid','Variant',
  'X-Antibody','De-Digivolve','Spirit','Mutant','Unknown'
];
const VALID_ELEMENTS = ['Fire','Water','Ice','Wind','Thunder','Light','Pitch Black','Steel','Wood','Land','Neutral'];
const VALID_ATTRIBUTES = ['Vaccine','Virus','Data','Unknown','None','Free'];
const VALID_RANKS = ['N','A','S','S+','SS','SS+','SSS','SSS+','U'];
const VALID_ATTACKER_TYPES = ['Quick Attacker','Short Attacker','Near Attacker','Defender'];
const VALID_FAMILIES = [
  "Nature Spirits","Deep Savers","Nightmare Soldiers","Wind Guardians",
  "Metal Empire","Virus Busters","Dragon's Roar","Jungle Troopers",
  "Unknown","Dark Area"
];

// --- HTTP helper ---
function req(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3001, path: urlPath, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': 'JWT ' + token } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// --- Parser ---
function parseDigimonEntries(text) {
  const entries = text.split(/={10,}/);
  const digimon = [];

  for (const entry of entries) {
    const lines = entry.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 5) continue;

    const d = parseOneDigimon(lines);
    if (d && d.name) digimon.push(d);
  }
  return digimon;
}

function parseOneDigimon(lines) {
  const d = {
    name: '',
    slug: '',
    form: 'Rookie',
    attribute: 'None',
    element: 'Neutral',
    attackerType: null,
    type: null,
    rank: null,
    families: [],
    names: { japanese: '', katakana: '', korean: '', chinese: '', thai: '' },
    introduction: null,
    stats: { hp: 0, at: 0, de: 0, as: 0, ds: 0, ct: 0, ht: 0, ev: 0 },
    maxStats: { hp: 0, at: 0, de: 0, as: 0, ds: 0, ct: 0, ht: 0, ev: 0 },
    skills: [],
    digivolutions: { digivolvesFrom: [], digivolvesTo: [] },
    published: true,
    availability: { canBeHatched: false, available: true, limitedTime: false },
    rideability: { canBeRidden: false, rideableWithItem: null, rideSpeed: null },
  };

  // Line 0 is typically the name
  // Keep parenthesized English names like "Agumon (Classic)" but strip Japanese katakana like "(アグモン)›"
  let rawName = lines[0].trim();
  // Remove trailing › and katakana in parens
  rawName = rawName.replace(/\s*[（(][ァ-ヿー・\s]+[）)].*$/, '').trim();
  // Remove trailing › if present
  rawName = rawName.replace(/[›»].*$/, '').trim();
  d.name = rawName;
  if (!d.name || d.name.length > 100) return null;

  // Extract katakana from first few lines
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const katMatch = lines[i].match(/[（(]([ァ-ヿー・\s]+)[）)]/);
    if (katMatch) d.names.katakana = katMatch[1].trim();
    
    const korMatch = lines[i].match(/Korean name:\s*(.+)/);
    if (korMatch) d.names.korean = korMatch[1].trim();
    
    const chiMatch = lines[i].match(/Chinese name:\s*(.+)/);
    if (chiMatch) d.names.chinese = chiMatch[1].trim();
    
    const thaiMatch = lines[i].match(/Thai name:\s*(.+)/);
    if (thaiMatch) d.names.thai = thaiMatch[1].trim();
  }

  // Parse key-value fields
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Form
    const formMatch = line.match(/^Form:\s*(.+)/);
    if (formMatch) {
      let form = formMatch[1].trim();
      if (VALID_FORMS.includes(form)) d.form = form;
      else if (form.includes('Burst')) d.form = 'Burst Mode';
      else if (form.includes('Mega')) d.form = 'Mega';
      else if (form.includes('Ultimate')) d.form = 'Ultimate';
      else if (form.includes('Champion')) d.form = 'Champion';
      else if (form.includes('Rookie')) d.form = 'Rookie';
      else if (form.includes('Armor')) d.form = 'Armor';
      else if (form.includes('H-Hybrid')) d.form = 'H-Hybrid';
      else if (form.includes('B-Hybrid')) d.form = 'B-Hybrid';
      else if (form.includes('A-Hybrid')) d.form = 'A-Hybrid';
      else if (form.includes('Z-Hybrid')) d.form = 'Z-Hybrid';
      else if (form.includes('Jogress')) d.form = form.includes('Mega') ? 'Jogress Mega' : 'Jogress';
      else if (form.includes('Side')) d.form = 'Side Mega';
      else if (form.includes('Ultra')) d.form = 'Ultra';
      else if (form.includes('X-Antibody')) d.form = 'X-Antibody';
      else if (form.includes('In-Training')) d.form = 'In-Training';
      else if (form.includes('Fresh')) d.form = 'Fresh';
      else if (form.includes('Spirit')) d.form = 'Spirit';
      else if (form.includes('Mutant')) d.form = 'Mutant';
      else if (form.includes('De-Digivolve')) d.form = 'De-Digivolve';
      else if (form.includes('Variant')) d.form = 'Variant';
      else d.form = 'Unknown';
    }

    // Attribute
    const attrMatch = line.match(/^Attribute:\s*(.+)/);
    if (attrMatch) {
      const raw = attrMatch[1].trim();
      if (raw.startsWith('Vaccine')) d.attribute = 'Vaccine';
      else if (raw.startsWith('Virus')) d.attribute = 'Virus';
      else if (raw.startsWith('Data')) d.attribute = 'Data';
      else if (raw.startsWith('Unknown')) d.attribute = 'Unknown';
      else if (raw.startsWith('Free')) d.attribute = 'Free';
      else d.attribute = 'None';
    }

    // Element
    const elemMatch = line.match(/^Elemental Attribute:\s*(.+)/);
    if (elemMatch) {
      const raw = elemMatch[1].trim();
      for (const e of VALID_ELEMENTS) {
        if (raw.startsWith(e) || raw.toLowerCase().startsWith(e.toLowerCase())) {
          d.element = e;
          break;
        }
      }
    }

    // Attacker Type
    const atkTypeMatch = line.match(/^Attacker Type:\s*(.+)/);
    if (atkTypeMatch) {
      const raw = atkTypeMatch[1].trim();
      for (const at of VALID_ATTACKER_TYPES) {
        if (raw.includes(at)) { d.attackerType = at; break; }
      }
    }

    // Type
    const typeMatch = line.match(/^Type:\s*(.+)/);
    if (typeMatch) d.type = typeMatch[1].trim();

    // Rank
    const rankMatch = line.match(/^Rank:\s*(.+)/);
    if (rankMatch) {
      let rank = rankMatch[1].trim();
      // Normalize: "S+" etc
      if (VALID_RANKS.includes(rank)) d.rank = rank;
    }

    // Families
    const famMatch = line.match(/^Famil(?:y|ies):\s*(.+)/);
    if (famMatch) {
      const raw = famMatch[1].trim();
      for (const f of VALID_FAMILIES) {
        if (raw.includes(f)) d.families.push(f);
      }
    }

    // Digivolved from
    const fromMatch = line.match(/^Digivolved from:\s*(.+)/);
    if (fromMatch) {
      const name = fromMatch[1].trim().replace(/_/g, ' ');
      if (name && name !== 'TBD') d.digivolutions.digivolvesFrom.push({ name });
    }

    // Digivolves to
    const toMatch = line.match(/^Digivolves to:\s*(.+)/);
    if (toMatch) {
      const name = toMatch[1].trim().replace(/_/g, ' ');
      if (name && name !== 'TBD') d.digivolutions.digivolvesTo.push({ name });
    }

    // Can be ridden
    const rideMatch = line.match(/^Can be ridden\s+(.+)/);
    if (rideMatch) {
      d.rideability.canBeRidden = rideMatch[1].trim().startsWith('Yes');
    }

    // Can be hatched
    const hatchMatch = line.match(/^Can be hatched\s+(.+)/);
    if (hatchMatch) {
      d.availability.canBeHatched = hatchMatch[1].trim().startsWith('Yes');
    }

    // Available
    const availMatch = line.match(/^Available:\s*(.+)/);
    if (availMatch) {
      d.availability.available = availMatch[1].trim().startsWith('Yes');
    }

    // Unlocked at level
    const levelMatch = line.match(/^Unlocked at level:\s*(\d+)/);
    if (levelMatch) d.unlockedAtLevel = parseInt(levelMatch[1]);

    // Unlocked with item
    const itemMatch = line.match(/^Unlocked with item:\s*(.+)/);
    if (itemMatch) {
      // The format is "ItemName ItemName" (repeated), take first half
      const raw = itemMatch[1].trim();
      const words = raw.split(/\s+/);
      if (words.length >= 2) {
        d.unlockedWithItem = words.slice(0, Math.ceil(words.length / 2)).join(' ');
      } else {
        d.unlockedWithItem = raw;
      }
    }

    // Rideable with item
    const rideItemMatch = line.match(/^Rideable with item:\s*(.+)/);
    if (rideItemMatch) {
      const raw = rideItemMatch[1].trim();
      const words = raw.split(/\s+/);
      d.rideability.rideableWithItem = words.slice(0, Math.ceil(words.length / 2)).join(' ');
    }

    // Stats parsing
    const hpMatch = line.match(/^Health Points\s+([\d,]+)\s+([\d,]+)/);
    if (hpMatch) {
      d.maxStats.hp = parseInt(hpMatch[1].replace(/,/g, ''));
      d.stats.hp = parseInt(hpMatch[2].replace(/,/g, ''));
    }
    const dsMatch = line.match(/^Digi-Soul\s+([\d,]+)\s+([\d,]+)/);
    if (dsMatch) {
      d.maxStats.ds = parseInt(dsMatch[1].replace(/,/g, ''));
      d.stats.ds = parseInt(dsMatch[2].replace(/,/g, ''));
    }
    const atMatch = line.match(/^Attack\s+([\d,]+)\s+([\d,]+)\s*$/);
    if (atMatch) {
      d.maxStats.at = parseInt(atMatch[1].replace(/,/g, ''));
      d.stats.at = parseInt(atMatch[2].replace(/,/g, ''));
    }
    const asMatch = line.match(/^Attack Speed\s+([\d.]+)/);
    if (asMatch) {
      d.stats.as = parseFloat(asMatch[1]);
      d.maxStats.as = d.stats.as;
    }
    const ctMatch = line.match(/^Critical Hit\s+([\d.,]+)%\s+([\d.,]+)%/);
    if (ctMatch) {
      d.maxStats.ct = parseFloat(ctMatch[1].replace(',', '.'));
      d.stats.ct = parseFloat(ctMatch[2].replace(',', '.'));
    }
    const htMatch = line.match(/^Hit Rate\s+([\d,]+)/);
    if (htMatch) {
      d.stats.ht = parseInt(htMatch[1].replace(/,/g, ''));
      d.maxStats.ht = d.stats.ht;
    }
    const defMatch = line.match(/^Defense\s+([\d,]+)\s+([\d,]+)/);
    if (defMatch) {
      d.maxStats.de = parseInt(defMatch[1].replace(/,/g, ''));
      d.stats.de = parseInt(defMatch[2].replace(/,/g, ''));
    }
    const evMatch = line.match(/^Evade\s+([\d.,]+)%/);
    if (evMatch) {
      d.stats.ev = parseFloat(evMatch[1].replace(',', '.'));
      d.maxStats.ev = d.stats.ev;
    }
  }

  // Parse skills from "Attacks" section
  let inAttacks = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'Attacks' || lines[i] === 'Attack') {
      inAttacks = true;
      continue;
    }
    if (inAttacks) {
      // Skill line format: "SkillName\tElement attribute\tX seconds cooldown\tY DS consumed\tZ skill points per upgrade\tW seconds animation"
      const skillMatch = lines[i].match(/^(.+?)\t(.+?)\s+attribute\t([\d.,]+)\s+seconds?\s+cooldown\t(\d+)\s+DS consumed\t(\d+)\s+skill points?\s+per upgrade\t([\d.,]+)\s+seconds?\s+animation/);
      if (skillMatch) {
        const skill = {
          name: skillMatch[1].trim(),
          type: 'Attack',
          element: null,
          cooldown: parseFloat(skillMatch[3].replace(',', '.')),
          dsConsumption: parseInt(skillMatch[4]),
          skillPointsPerUpgrade: parseInt(skillMatch[5]),
          animationTime: parseFloat(skillMatch[6].replace(',', '.')),
          description: '',
        };
        // Extract element
        const elemRaw = skillMatch[2].trim();
        for (const e of VALID_ELEMENTS) {
          if (elemRaw.includes(e)) { skill.element = e; break; }
        }
        // Next line might be description
        if (i + 1 < lines.length && !lines[i + 1].match(/^(Attack|Lv\.|[A-Z].*\t)/)) {
          skill.description = lines[i + 1].trim();
        }
        d.skills.push(skill);
        continue;
      }

      // Damage table header (skip)
      if (lines[i].match(/^Attack\s+Lv\.1/)) continue;

      // Damage values line: "SkillName\t1234\t1345\t..."
      const dmgParts = lines[i].split('\t');
      if (dmgParts.length >= 26) {
        const skillName = dmgParts[0].trim();
        const matchingSkill = d.skills.find(s => s.name === skillName);
        if (matchingSkill) {
          const values = [];
          for (let lvl = 1; lvl <= 25; lvl++) {
            const val = parseInt(dmgParts[lvl]);
            if (!isNaN(val)) values.push({ level: lvl, damage: val });
          }
          if (values.length > 0) {
            matchingSkill.damagePerLevel = JSON.stringify(values);
          }
        }
      }

      // Stop parsing attacks at certain markers
      if (lines[i].match(/^(Overview|Pros:|Cons:|Jogress|Hatching|Digivolves|Note:|See also|Promo|Rank Passives|U Rank|SSS Passives|F[123] )/)) {
        inAttacks = false;
      }
    }
  }

  // Find introduction text (paragraph after header fields, before sections)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 100 && !lines[i].includes('\t') && !lines[i].match(/^(Form|Rank|Attribute|Elemental|Attacker|Type|Famil|Digivol|Can be|Available|Unlocked|Rideable|Location|Health|Digi-Soul|Attack|Defense|Evade|Critical|Hit Rate|Note:|Approximate|Base Value|Movement|Jogress|Default|Overview|Pros|Cons)/)) {
      d.introduction = lines[i];
      break;
    }
  }

  // Generate slug
  d.slug = d.name.toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return d;
}

// --- Main ---
async function main() {
  console.log('=== Digimon MD Import ===\n');

  // Login
  const loginRes = await req('POST', '/api/users/login', { email: OWNER_EMAIL, password: OWNER_PASS });
  if (!loginRes.body.token) {
    console.error('Login failed:', loginRes.body);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('Logged in as owner\n');

  // Read all MD files
  const mdDir = __dirname;
  const files = [
    'Data-Digimon-A-Z.md',
    'Vaccine-Digimon-A-M.md',
    'Vaccine-Digimon-N-Z.md',
    'Virus-Digimon-A-Z.md',
    'Unknown-Type-Digimon.md',
  ];

  let allDigimon = [];
  for (const f of files) {
    const fpath = path.join(mdDir, f);
    if (!fs.existsSync(fpath)) {
      console.warn(`File not found: ${fpath}`);
      continue;
    }
    const text = fs.readFileSync(fpath, 'utf-8');
    const parsed = parseDigimonEntries(text);
    console.log(`Parsed ${f}: ${parsed.length} Digimon`);
    allDigimon.push(...parsed);
  }

  // Deduplicate by slug (keep last occurrence = latest data)
  const bySlug = new Map();
  for (const d of allDigimon) {
    bySlug.set(d.slug, d);
  }
  allDigimon = Array.from(bySlug.values());
  console.log(`\nTotal unique Digimon: ${allDigimon.length}\n`);

  // Get existing Digimon from CMS
  console.log('Fetching existing Digimon from CMS...');
  const existingMap = new Map();
  let page = 1;
  while (true) {
    const res = await req('GET', `/api/digimon?limit=100&page=${page}&depth=0`, null, token);
    if (!res.body.docs) break;
    for (const doc of res.body.docs) {
      existingMap.set(doc.slug, doc.id);
    }
    if (!res.body.hasNextPage) break;
    page++;
  }
  console.log(`Existing in CMS: ${existingMap.size}\n`);

  // Import
  const retryOnly = process.argv.includes('--retry-only');
  if (retryOnly) console.log('RETRY MODE: only creating missing entries\n');
  let created = 0, updated = 0, failed = 0, skipped = 0;

  for (let i = 0; i < allDigimon.length; i++) {
    const d = allDigimon[i];
    const pct = Math.round((i / allDigimon.length) * 100);

    // Build payload data
    const payload = {
      name: d.name,
      slug: d.slug,
      form: d.form,
      attribute: d.attribute,
      element: d.element,
      published: true,
    };
    if (d.attackerType) payload.attackerType = d.attackerType;
    if (d.type) payload.type = d.type;
    if (d.rank) payload.rank = d.rank;
    if (d.families.length > 0) payload.families = d.families;
    if (d.names) payload.names = d.names;
    if (d.introduction) payload.introduction = d.introduction;
    if (d.stats) payload.stats = d.stats;
    if (d.maxStats) payload.maxStats = d.maxStats;
    if (d.skills.length > 0) payload.skills = d.skills;
    if (d.digivolutions) payload.digivolutions = d.digivolutions;
    if (d.rideability) payload.rideability = d.rideability;
    if (d.availability) payload.availability = d.availability;
    if (d.unlockedAtLevel) payload.unlockedAtLevel = d.unlockedAtLevel;
    if (d.unlockedWithItem) payload.unlockedWithItem = d.unlockedWithItem;

    try {
      const existingId = existingMap.get(d.slug);
      let res;

      if (existingId) {
        if (retryOnly) { skipped++; continue; }
        // Delay to avoid rate limiting
        if (i > 0 && i % 10 === 0) await new Promise(r => setTimeout(r, 3000));
        else if (i > 0) await new Promise(r => setTimeout(r, 200));
        // Update existing
        res = await req('PATCH', `/api/digimon/${existingId}`, payload, token);
        if (res.status === 200 && res.body.doc) {
          updated++;
          if (i % 20 === 0) process.stdout.write(`[${pct}%] Updated: ${d.name}\n`);
        } else {
          console.error(`  FAILED update ${d.name}: ${JSON.stringify(res.body).substring(0, 150)}`);
          failed++;
        }
      } else {
        // Delay before create
        await new Promise(r => setTimeout(r, 2000));
        // Create new
        res = await req('POST', '/api/digimon', payload, token);
        if ((res.status === 200 || res.status === 201) && res.body.doc) {
          created++;
          existingMap.set(d.slug, res.body.doc.id);
          if (i % 20 === 0) process.stdout.write(`[${pct}%] Created: ${d.name}\n`);
        } else {
          console.error(`  FAILED create ${d.name}: ${JSON.stringify(res.body).substring(0, 150)}`);
          failed++;
        }
      }
    } catch (err) {
      console.error(`  ERROR ${d.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Total:   ${allDigimon.length}`);

  // Final count
  const countRes = await req('GET', '/api/digimon?limit=1', null, token);
  console.log(`\nDB total: ${countRes.body.totalDocs}`);

  // Test findByID
  if (countRes.body.docs && countRes.body.docs.length > 0) {
    const testId = countRes.body.docs[0].id;
    const testRes = await req('GET', `/api/digimon/${testId}`, null, token);
    if (testRes.body.name) {
      console.log(`findByID test: OK - ${testRes.body.name} (${testId})`);
    } else {
      console.log(`findByID test: FAILED`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
