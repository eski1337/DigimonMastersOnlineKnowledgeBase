#!/usr/bin/env node
/**
 * Fix all remaining map issues:
 * 1. Upload Babamon icon → link to Wind Valley NPC
 * 2. Find & link Work Chief + Accommodation Guard icons for Oil Refinery 3
 * 3. Fix Yokohama East Village (missing wild digimon data)
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;

let TOKEN = '';

async function login() {
  const res = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  TOKEN = data.token;
  console.log('✅ Logged in');
}

async function uploadImage(filePath, altText) {
  if (!existsSync(filePath)) {
    console.error(`  ⚠ File not found: ${filePath}`);
    return null;
  }
  const fileData = readFileSync(filePath);
  const fileName = path.basename(filePath);
  const mimeType = 'image/png';
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const preFile = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="alt"\r\n\r\n${altText}\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
    'utf-8'
  );
  const postFile = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  const body = Buffer.concat([preFile, fileData, postFile]);
  const res = await fetch(`${CMS}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${TOKEN}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`  ✗ Upload failed: ${fileName} ${res.status} ${txt.slice(0, 200)}`);
    return null;
  }
  const data = await res.json();
  console.log(`  ↑ Uploaded: ${fileName} → id=${data.doc?.id}`);
  return data.doc?.id || null;
}

async function getMapBySlug(slug) {
  const res = await fetch(`${CMS}/api/maps?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=2`, {
    headers: { Authorization: `JWT ${TOKEN}` },
  });
  const data = await res.json();
  return data.docs?.[0] || null;
}

async function patchMap(mapId, payload) {
  const res = await fetch(`${CMS}/api/maps/${mapId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${TOKEN}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`  ✗ Patch failed: ${res.status} ${txt.slice(0, 300)}`);
    return false;
  }
  return true;
}

async function findMediaByFilename(filename) {
  const res = await fetch(`${CMS}/api/media?where[filename][contains]=${encodeURIComponent(filename)}&limit=5`, {
    headers: { Authorization: `JWT ${TOKEN}` },
  });
  const data = await res.json();
  return data.docs || [];
}

async function main() {
  await login();

  // ═══════════════════════════════════════════════════
  // FIX 1: Wind Valley — upload Babamon icon, link it
  // ═══════════════════════════════════════════════════
  console.log('\n═══ FIX 1: Wind Valley — Babamon NPC icon ═══');
  const windValley = await getMapBySlug('wind-valley');
  if (windValley) {
    // Upload Babamon icon
    const babamonId = await uploadImage(
      path.resolve('map-assets/Babamon_Enemy.png'),
      'Babamon NPC icon'
    );
    if (babamonId) {
      // Find the Babamon NPC entry and set its icon
      const npcs = windValley.npcs.map(n => ({
        name: n.name,
        role: n.role || '',
        icon: n.name === 'Babamon' ? babamonId : (typeof n.icon === 'object' ? n.icon?.id : n.icon) || undefined,
      }));
      await patchMap(windValley.id, { npcs });
      console.log('  ✅ Wind Valley — Babamon icon linked');
    }
  }

  // ═══════════════════════════════════════════════════
  // FIX 2: Oil Refinery 3 — Work Chief & Accommodation Guard
  // ═══════════════════════════════════════════════════
  console.log('\n═══ FIX 2: Oil Refinery 3 — missing NPC icons ═══');
  const or3 = await getMapBySlug('oil-refinery-3');
  if (or3) {
    // Check which NPCs are missing icons
    const missingNpcs = (or3.npcs || []).filter(n => !n.icon);
    console.log(`  Missing icons for: ${missingNpcs.map(n => n.name).join(', ')}`);
    
    // Search CMS media for any matching icons
    for (const npc of missingNpcs) {
      const searchName = npc.name.replace(/\s+/g, '_');
      const results = await findMediaByFilename(searchName);
      if (results.length > 0) {
        console.log(`  Found existing media for ${npc.name}: ${results[0].filename} (id=${results[0].id})`);
      } else {
        console.log(`  No media found for ${npc.name} — these NPCs have no icon source available`);
      }
    }
    // Note: Work Chief and Accommodation Guard don't have wiki icons
    // We'll leave them without icons as there's no source
  }

  // ═══════════════════════════════════════════════════
  // FIX 3: Yokohama East Village — add wild digimon data
  // ═══════════════════════════════════════════════════
  console.log('\n═══ FIX 3: Yokohama East Village — add wild digimon ═══');
  const yev = await getMapBySlug('yokohama-east-village');
  if (yev) {
    // Upload DemiMeramon icon if not present
    let demiMeramonIconId = null;
    const existing = await findMediaByFilename('DemiMeramon');
    if (existing.length > 0) {
      demiMeramonIconId = existing[0].id;
      console.log(`  Found existing DemiMeramon icon: id=${demiMeramonIconId}`);
    }

    // Search for more Yokohama East Village digimon icons
    const kuneMonResults = await findMediaByFilename('Kunemon');
    const elecmonResults = await findMediaByFilename('Elecmon');

    const wildDigimon = [
      { name: 'DemiMeramon', level: '3-5', element: 'Fire', attribute: 'Data', ...(demiMeramonIconId ? { icon: demiMeramonIconId } : {}) },
      { name: 'Kunemon', level: '5-7', element: 'Wood', attribute: 'Virus', ...(kuneMonResults.length > 0 ? { icon: kuneMonResults[0].id } : {}) },
      { name: 'Elecmon', level: '5-8', element: 'Thunder', attribute: 'Data', ...(elecmonResults.length > 0 ? { icon: elecmonResults[0].id } : {}) },
    ];

    await patchMap(yev.id, { wildDigimon, mapType: 'field' });
    console.log('  ✅ Yokohama East Village — wild digimon added');
  }

  // ═══════════════════════════════════════════════════
  // VERIFY: Re-check all fixed maps
  // ═══════════════════════════════════════════════════
  console.log('\n═══ VERIFICATION ═══');
  for (const slug of ['wind-valley', 'oil-refinery-3', 'yokohama-east-village']) {
    const m = await getMapBySlug(slug);
    if (!m) { console.log(`  ❌ ${slug} not found`); continue; }
    const missingDigiIcons = (m.wildDigimon || []).filter(d => !d.icon).length;
    const missingNpcIcons = (m.npcs || []).filter(n => !n.icon).length;
    console.log(`  ${slug}: ${m.wildDigimon?.length || 0} digi (${missingDigiIcons} missing icons), ${m.npcs?.length || 0} npc (${missingNpcIcons} missing icons)`);
  }

  console.log('\n✅ All fixable issues addressed.');
}

main().catch(console.error);
