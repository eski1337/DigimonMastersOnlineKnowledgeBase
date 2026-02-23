#!/usr/bin/env node
/**
 * Links existing media files to Digimon documents based on belongsTo.digimon field.
 * Media files have belongsTo.digimon = "Agumon" etc, and imageType = "digimon-icon" or "digimon-main"
 * This script matches them to the correct Digimon document and sets the icon/mainImage fields.
 */

const http = require('http');

const CMS_URL = 'http://localhost:3001';
const OWNER_EMAIL = 'eski@dmokb.info';
const OWNER_PASS = 'EskiDMOKB2026!';

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3001, path, method,
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

async function main() {
  console.log('=== Link Media to Digimon ===\n');

  // Login
  const loginRes = await req('POST', '/api/users/login', { email: OWNER_EMAIL, password: OWNER_PASS });
  const token = loginRes.body.token;
  if (!token) { console.error('Login failed'); process.exit(1); }

  // Step 1: Get all Digimon (name -> id mapping)
  console.log('Loading all Digimon...');
  const digimonByName = new Map();
  const digimonBySlug = new Map();
  let page = 1;
  while (true) {
    const res = await req('GET', `/api/digimon?limit=100&page=${page}&depth=0`, null, token);
    for (const doc of res.body.docs || []) {
      digimonByName.set(doc.name.toLowerCase(), doc);
      digimonBySlug.set(doc.slug, doc);
    }
    if (!res.body.hasNextPage) break;
    page++;
  }
  console.log(`Loaded ${digimonByName.size} Digimon\n`);

  // Step 2: Get all media with digimon references
  console.log('Loading media with digimon references...');
  const mediaByDigimon = new Map(); // digimonName -> { icons: [], mains: [] }
  page = 1;
  let totalMedia = 0;
  while (true) {
    const res = await req('GET', `/api/media?limit=100&page=${page}&depth=0`, null, token);
    for (const media of res.body.docs || []) {
      totalMedia++;
      const digimonName = media.belongsTo?.digimon;
      if (!digimonName) continue;

      const key = digimonName.toLowerCase();
      if (!mediaByDigimon.has(key)) {
        mediaByDigimon.set(key, { icons: [], mains: [], name: digimonName });
      }
      const entry = mediaByDigimon.get(key);

      if (media.imageType === 'digimon-icon' || media.filename?.includes('Icon')) {
        entry.icons.push(media);
      } else if (media.imageType === 'digimon-main' || (!media.filename?.includes('Icon') && !media.filename?.includes('Sprite'))) {
        entry.mains.push(media);
      }
    }
    if (!res.body.hasNextPage) break;
    page++;
  }
  console.log(`Loaded ${totalMedia} media files, ${mediaByDigimon.size} have digimon refs\n`);

  // Step 3: Link media to Digimon
  let linked = 0, skipped = 0, notFound = 0, failed = 0;

  for (const [nameLower, mediaGroup] of mediaByDigimon) {
    const digimon = digimonByName.get(nameLower);
    if (!digimon) {
      // Try fuzzy match
      const slug = nameLower.replace(/[()]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
      const bySlug = digimonBySlug.get(slug);
      if (!bySlug) {
        notFound++;
        continue;
      }
    }

    const doc = digimon || digimonBySlug.get(nameLower.replace(/[()]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'));
    if (!doc) { notFound++; continue; }

    // Check if already has images
    if (doc.icon && doc.mainImage) {
      skipped++;
      continue;
    }

    const update = {};
    if (!doc.icon && mediaGroup.icons.length > 0) {
      update.icon = mediaGroup.icons[0].id;
    }
    if (!doc.mainImage && mediaGroup.mains.length > 0) {
      update.mainImage = mediaGroup.mains[0].id;
    }

    if (Object.keys(update).length === 0) {
      skipped++;
      continue;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 150));

    const res = await req('PATCH', `/api/digimon/${doc.id}`, update, token);
    if (res.status === 200 && res.body.doc) {
      linked++;
      if (linked % 50 === 0) console.log(`  Linked ${linked}...`);
    } else {
      failed++;
      if (failed <= 5) console.error(`  FAILED ${doc.name}: ${JSON.stringify(res.body).substring(0, 100)}`);
    }
  }

  console.log(`\n=== Link Results ===`);
  console.log(`Linked: ${linked}`);
  console.log(`Skipped (already has images): ${skipped}`);
  console.log(`Not found in DB: ${notFound}`);
  console.log(`Failed: ${failed}`);

  // Step 4: Count results
  let withIcon = 0, withMain = 0;
  page = 1;
  while (true) {
    const res = await req('GET', `/api/digimon?limit=100&page=${page}&depth=0`, null, token);
    for (const doc of res.body.docs || []) {
      if (doc.icon) withIcon++;
      if (doc.mainImage) withMain++;
    }
    if (!res.body.hasNextPage) break;
    page++;
  }
  console.log(`\nDigimon with icon: ${withIcon}`);
  console.log(`Digimon with mainImage: ${withMain}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
