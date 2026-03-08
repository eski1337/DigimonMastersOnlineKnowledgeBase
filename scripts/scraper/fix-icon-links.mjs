#!/usr/bin/env node
/**
 * Fix Icon/Image Links Script
 * 
 * Queries CMS for all Digimon entries, finds the correct media documents
 * for icons, mainImages, and skill icons, then patches the Digimon entries.
 *
 * Problem: The import uploaded duplicate images which got "-1" suffixed filenames,
 * causing 404s. Some icons were also not linked at all.
 *
 * This script:
 *   1. Fetches ALL media documents and indexes them by filename
 *   2. Fetches ALL Digimon entries
 *   3. For each Digimon, finds the best matching icon + mainImage media
 *   4. For each skill, finds the best matching skill icon media
 *   5. PATCHes the Digimon with correct media IDs
 *
 * Usage:
 *   node fix-icon-links.mjs [--dry-run] [--filter=name]
 */

const CMS_URL = process.env.CMS_URL || 'https://cms.dmokb.info';
const SVC_EMAIL = 'service@dmokb.info';
const SVC_PASSWORD = 'SvcFixRunner2026!';

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const FILTER = ARGS.find(a => a.startsWith('--filter='))?.split('=')[1] || null;
const RETRY_MAX = 5;
const RETRY_DELAYS = [5000, 15000, 30000, 60000, 120000];

let authToken = '';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(level, msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] [${level}] ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// CMS API helpers
// ═══════════════════════════════════════════════════════════════════════════

async function fetchWithRetry(url, options, label = '') {
  for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status >= 500) {
        const delay = RETRY_DELAYS[attempt] || 120000;
        log('WARN', `Rate limited (${res.status}) on ${label} — retry ${attempt + 1}/${RETRY_MAX} in ${delay / 1000}s`);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (e) {
      if (attempt === RETRY_MAX - 1) throw e;
      const delay = RETRY_DELAYS[attempt] || 120000;
      log('WARN', `Fetch error on ${label}: ${e.message} — retry ${attempt + 1}/${RETRY_MAX} in ${delay / 1000}s`);
      await sleep(delay);
    }
  }
  return fetch(url, options);
}

async function cmsLogin() {
  log('INFO', `Logging into CMS as ${SVC_EMAIL}...`);
  for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
    try {
      const res = await fetch(`${CMS_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: SVC_EMAIL, password: SVC_PASSWORD }),
      });
      if (res.status === 429 || res.status >= 500) {
        const delay = RETRY_DELAYS[attempt] || 120000;
        log('WARN', `Login rate limited (${res.status}) — retry ${attempt + 1}/${RETRY_MAX} in ${delay / 1000}s`);
        await sleep(delay);
        continue;
      }
      const data = await res.json();
      if (!data.token) throw new Error('CMS login failed: ' + JSON.stringify(data));
      authToken = data.token;
      log('INFO', `Logged in as ${data.user?.email}`);
      return;
    } catch (e) {
      if (attempt === RETRY_MAX - 1) throw e;
      const delay = RETRY_DELAYS[attempt] || 120000;
      log('WARN', `Login error: ${e.message} — retry ${attempt + 1}/${RETRY_MAX} in ${delay / 1000}s`);
      await sleep(delay);
    }
  }
}

function authHeaders() {
  return { Authorization: `JWT ${authToken}` };
}

// ═══════════════════════════════════════════════════════════════════════════
// Fetch all documents from a collection (paginated)
// ═══════════════════════════════════════════════════════════════════════════

async function fetchAll(collection, extraQuery = '') {
  const docs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${CMS_URL}/api/${collection}?limit=100&page=${page}&depth=0${extraQuery}`;
    const res = await fetchWithRetry(url, { headers: authHeaders() }, `fetchAll ${collection} p${page}`);
    const data = await res.json();
    docs.push(...(data.docs || []));
    hasMore = data.hasNextPage;
    page++;
    await sleep(300);
  }

  return docs;
}

// ═══════════════════════════════════════════════════════════════════════════
// Build media index
// ═══════════════════════════════════════════════════════════════════════════

function buildMediaIndex(allMedia) {
  // Index by exact filename
  const byFilename = new Map(); // filename -> media doc
  // Index by base name (without -1, -2 suffixes)
  const byBaseName = new Map(); // baseName -> [media docs]
  // Index by belongsTo.digimon
  const byDigimon = new Map(); // digimonName -> [media docs]

  for (const media of allMedia) {
    const fn = media.filename;
    if (!fn) continue;

    // By exact filename
    if (!byFilename.has(fn)) {
      byFilename.set(fn, media);
    }

    // Parse base name: "Agumon_Icon-1.png" -> "Agumon_Icon.png"
    const baseName = fn.replace(/-\d+(\.\w+)$/, '$1');
    if (!byBaseName.has(baseName)) byBaseName.set(baseName, []);
    byBaseName.get(baseName).push(media);

    // By digimon name
    const digName = media.belongsTo?.digimon;
    if (digName) {
      if (!byDigimon.has(digName)) byDigimon.set(digName, []);
      byDigimon.get(digName).push(media);
    }
  }

  return { byFilename, byBaseName, byDigimon };
}

// ═══════════════════════════════════════════════════════════════════════════
// Find best media for a Digimon
// ═══════════════════════════════════════════════════════════════════════════

function findBestMedia(mediaIndex, digimonName, suffix, imageType) {
  const { byFilename, byBaseName, byDigimon } = mediaIndex;

  // Strategy 1: Exact filename match (e.g. "Agumon_Icon.png")
  const exactName = digimonName.replace(/\s+/g, '_') + suffix;
  if (byFilename.has(exactName)) {
    return byFilename.get(exactName);
  }

  // Strategy 2: Base name match (handles "-1" suffixed duplicates)
  const baseMatches = byBaseName.get(exactName);
  if (baseMatches && baseMatches.length > 0) {
    // Prefer the one without -1 suffix, then the most recent
    const original = baseMatches.find(m => m.filename === exactName);
    if (original) return original;
    // Return the first one (likely the -1 version)
    return baseMatches[0];
  }

  // Strategy 3: Search by belongsTo.digimon + imageType
  const digMedia = byDigimon.get(digimonName);
  if (digMedia) {
    const typed = digMedia.find(m => m.imageType === imageType);
    if (typed) return typed;

    // Match by suffix pattern in filename
    const suffixPattern = suffix.replace('.png', '').replace('.jpg', '');
    const byPattern = digMedia.find(m => m.filename?.includes(suffixPattern));
    if (byPattern) return byPattern;
  }

  // Strategy 4: Fuzzy name match — try with parentheses for special forms
  // e.g. "Agumon (Classic)" -> "Agumon_(Classic)_Icon.png"
  const variants = [
    digimonName.replace(/\s+/g, '_') + suffix,
    digimonName.replace(/\s+/g, '') + suffix,
    digimonName.replace(/[\s()]+/g, '_').replace(/_+/g, '_') + suffix,
  ];

  for (const variant of variants) {
    if (byFilename.has(variant)) return byFilename.get(variant);
    const baseMatch = byBaseName.get(variant);
    if (baseMatch && baseMatch.length > 0) return baseMatch[0];
  }

  return null;
}

function findSkillMedia(mediaIndex, skillName) {
  const { byFilename, byBaseName } = mediaIndex;

  const exactName = skillName.replace(/\s+/g, '_') + '.png';
  if (byFilename.has(exactName)) return byFilename.get(exactName);

  const baseMatches = byBaseName.get(exactName);
  if (baseMatches && baseMatches.length > 0) {
    const original = baseMatches.find(m => m.filename === exactName);
    return original || baseMatches[0];
  }

  // Try with special chars cleaned
  const cleaned = skillName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') + '.png';
  if (byFilename.has(cleaned)) return byFilename.get(cleaned);
  const cleanedBase = byBaseName.get(cleaned);
  if (cleanedBase && cleanedBase.length > 0) return cleanedBase[0];

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Check if a media reference is valid (not a 404)
// ═══════════════════════════════════════════════════════════════════════════

function isMediaValid(mediaDoc) {
  if (!mediaDoc) return false;
  // A valid media doc should have a URL that doesn't 404
  // We can check if the filename has -1 suffix (likely to 404 on the original URL)
  return !!mediaDoc.id;
}

function resolveMediaId(field) {
  if (!field) return null;
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field.id) return field.id;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Fix Icon/Image Links Script                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('🔒 DRY RUN MODE — no changes will be made\n');

  await cmsLogin();

  // Step 1: Fetch all media
  log('INFO', 'Fetching all media documents...');
  const allMedia = await fetchAll('media');
  log('INFO', `Fetched ${allMedia.length} media documents`);

  // Build index
  const mediaIndex = buildMediaIndex(allMedia);
  log('INFO', `Media index: ${mediaIndex.byFilename.size} unique filenames, ${mediaIndex.byBaseName.size} base names, ${mediaIndex.byDigimon.size} digimon names`);

  // Step 2: Fetch all Digimon
  log('INFO', 'Fetching all Digimon entries...');
  const allDigimon = await fetchAll('digimon');
  log('INFO', `Fetched ${allDigimon.length} Digimon entries`);

  // Step 3: Process each Digimon
  const stats = {
    iconFixed: 0,
    iconAlreadyOk: 0,
    iconNotFound: 0,
    mainImageFixed: 0,
    mainImageAlreadyOk: 0,
    mainImageNotFound: 0,
    skillIconsFixed: 0,
    totalSkills: 0,
    errors: [],
  };

  for (const digimon of allDigimon) {
    if (FILTER && !digimon.name.toLowerCase().includes(FILTER.toLowerCase())) continue;

    const name = digimon.name;
    const currentIconId = resolveMediaId(digimon.icon);
    const currentMainId = resolveMediaId(digimon.mainImage);

    const updatePayload = {};
    let needsUpdate = false;

    // --- Fix icon ---
    const bestIcon = findBestMedia(mediaIndex, name, '_Icon.png', 'digimon-icon');
    if (bestIcon) {
      if (currentIconId !== bestIcon.id) {
        updatePayload.icon = bestIcon.id;
        needsUpdate = true;
        stats.iconFixed++;
        log('FIX', `${name}: icon → ${bestIcon.filename} (${bestIcon.id})`);
      } else {
        stats.iconAlreadyOk++;
      }
    } else {
      stats.iconNotFound++;
      if (!currentIconId) {
        log('MISS', `${name}: No icon media found`);
      }
    }

    // --- Fix mainImage ---
    const bestMain = findBestMedia(mediaIndex, name, '.png', 'digimon-main')
      || findBestMedia(mediaIndex, name, '.jpg', 'digimon-main');
    if (bestMain) {
      // Don't overwrite mainImage with a non-main image (e.g. an icon)
      if (bestMain.filename?.includes('_Icon') || bestMain.filename?.includes('_Hatch')) {
        // Skip — this isn't a main image
      } else if (currentMainId !== bestMain.id) {
        updatePayload.mainImage = bestMain.id;
        needsUpdate = true;
        stats.mainImageFixed++;
        log('FIX', `${name}: mainImage → ${bestMain.filename} (${bestMain.id})`);
      } else {
        stats.mainImageAlreadyOk++;
      }
    } else {
      stats.mainImageNotFound++;
    }

    // --- Fix skill icons ---
    if (digimon.skills && digimon.skills.length > 0) {
      let skillsChanged = false;
      const updatedSkills = digimon.skills.map(skill => {
        stats.totalSkills++;
        const currentSkillIconId = resolveMediaId(skill.icon);
        const bestSkillIcon = findSkillMedia(mediaIndex, skill.name);

        if (bestSkillIcon && currentSkillIconId !== bestSkillIcon.id) {
          skillsChanged = true;
          stats.skillIconsFixed++;
          log('FIX', `${name} skill "${skill.name}": icon → ${bestSkillIcon.filename}`);
          return { ...skill, icon: bestSkillIcon.id };
        }
        return skill;
      });

      if (skillsChanged) {
        // Clean up skills for the PATCH - remove any populated relation objects
        updatePayload.skills = updatedSkills.map(s => ({
          name: s.name,
          type: s.type || undefined,
          element: s.element || undefined,
          icon: resolveMediaId(s.icon) || undefined,
          description: s.description || undefined,
          cooldown: s.cooldown || undefined,
          dsConsumption: s.dsConsumption || undefined,
          skillPointsPerUpgrade: s.skillPointsPerUpgrade || undefined,
          animationTime: s.animationTime || undefined,
          damagePerLevel: s.damagePerLevel || undefined,
        }));
        needsUpdate = true;
      }
    }

    // --- Apply update ---
    if (needsUpdate && !DRY_RUN) {
      try {
        const res = await fetchWithRetry(`${CMS_URL}/api/digimon/${digimon.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(updatePayload),
        }, `patch ${name}`);
        if (!res.ok) {
          const text = await res.text();
          log('ERROR', `Failed to patch ${name}: ${text}`);
          stats.errors.push(`${name}: ${text}`);
        }
        await sleep(500);
      } catch (e) {
        log('ERROR', `Failed to patch ${name}: ${e.message}`);
        stats.errors.push(`${name}: ${e.message}`);
      }
    }
  }

  // Step 4: Print report
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     FIX REPORT                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Icons fixed:        ${stats.iconFixed}`);
  console.log(`Icons already OK:   ${stats.iconAlreadyOk}`);
  console.log(`Icons not found:    ${stats.iconNotFound}`);
  console.log(`MainImage fixed:    ${stats.mainImageFixed}`);
  console.log(`MainImage OK:       ${stats.mainImageAlreadyOk}`);
  console.log(`MainImage not found:${stats.mainImageNotFound}`);
  console.log(`Skill icons fixed:  ${stats.skillIconsFixed} / ${stats.totalSkills}`);
  console.log(`Errors:             ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n--- Errors ---');
    for (const err of stats.errors) console.log(`  ✗ ${err}`);
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
