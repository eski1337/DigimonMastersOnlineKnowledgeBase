#!/usr/bin/env node
/**
 * Uploads NPC and Digimon icons for Yokohama Village map, then updates the map entry
 * to link each NPC to its uploaded icon.
 */
import { readFileSync } from 'fs';
import path from 'path';

const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
const BASE = '/tmp/yokohama-maps/yokohama-village';

let TOKEN = '';

async function login() {
  const res = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  TOKEN = data.token;
  console.log('Logged in');
}

async function uploadImage(filePath, altText) {
  const fileData = readFileSync(filePath);
  const fileName = path.basename(filePath);
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const preFile = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="alt"\r\n\r\n${altText}\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: image/png\r\n\r\n`,
    'utf-8'
  );
  const postFile = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  const body = Buffer.concat([preFile, fileData, postFile]);

  const res = await fetch(`${CMS}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${TOKEN}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  if (!res.ok) { console.error(`  Upload failed: ${fileName} ${res.status}`); return null; }
  const data = await res.json();
  return data.doc?.id || null;
}

async function getMapBySlug(slug) {
  const res = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&limit=1&depth=2`, {
    headers: { Authorization: `JWT ${TOKEN}` },
  });
  const data = await res.json();
  return data.docs?.[0] || null;
}

async function updateMap(id, payload) {
  const res = await fetch(`${CMS}/api/maps/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${TOKEN}` },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

// NPC name -> icon filename mapping
const NPC_ICONS = {
  'Yoshino Fujieda': 'Yoshino_Fujieda_Icon.png',
  'Kristy Damon': 'Kristy_Damon_Icon.png',
  'Sarah Damon': 'Sarah_Damon_Icon.png',
  "Sora's Mom": "Sora's_Mom_Icon.png",
  'Megumi Shirakawa': 'Megumi_Shirakawa_Icon.png',
  'Miki Kurosaki': 'Miki_Kurosaki_Icon.png',
  'Inoue Mama': 'Inoue_Mama_Icon.png',
  'Michelle Krier': 'Michelle_Krier_Icon.png',
  'Takashi': 'Takashi_Icon.png',
  'Conner Shiratori': 'Conner_Shiratori_Icon.png',
  'Inoue Papa': 'Inoue_Papa_Icon.png',
  'Vending Machine': 'Vending_Machine_Icon.png',
  'Phonebooth': 'Phonebooth_Icon.png',
  'Teacher Mori': 'Teacher_Mori_Icon.png',
  'Asanuma': 'Asanuma_Icon.png',
  'Shiraki': 'Shiraki_Icon.png',
  'Vivi': 'Vivi_Icon.png',
  'Homer Yushima': 'Homer_Yushima_Icon.png',
  'Carry': 'Carry_Icon.png',
  'Akihiro Kurata': 'Akihiro_Kurata_Icon.png',
  'Doruphin': 'Doruphin_Icon.png',
  'PawnChessmon B': 'PawnChessmon_B_Icon.png',
  'PawnChessmon W': 'PawnChessmon_W_Icon.png',
  'DigimonArchive': 'DigimonArchive_Icon.png',
  'Incubator': 'Incubator_Icon.png',
};

async function main() {
  await login();

  // Get map
  const map = await getMapBySlug('yokohama-village');
  if (!map) { console.error('Map not found'); return; }
  console.log(`Found map: ${map.id}`);

  // Upload NPC icons and build updated npcs array
  console.log('\n--- Uploading NPC icons ---');
  const updatedNpcs = [];
  for (const npc of (map.npcs || [])) {
    const iconFile = NPC_ICONS[npc.name];
    if (iconFile) {
      const filePath = `${BASE}/npc-icons/${iconFile}`;
      try {
        const iconId = await uploadImage(filePath, `${npc.name} icon`);
        if (iconId) {
          console.log(`  ✅ ${npc.name} -> ${iconId}`);
          updatedNpcs.push({ name: npc.name, role: npc.role || '', icon: iconId });
        } else {
          updatedNpcs.push({ name: npc.name, role: npc.role || '', icon: npc.icon?.id || npc.icon || null });
        }
      } catch (e) {
        console.error(`  ❌ ${npc.name}: ${e.message}`);
        updatedNpcs.push({ name: npc.name, role: npc.role || '', icon: npc.icon?.id || npc.icon || null });
      }
    } else {
      console.log(`  ⏭️  ${npc.name} (no icon file)`);
      updatedNpcs.push({ name: npc.name, role: npc.role || '', icon: npc.icon?.id || npc.icon || null });
    }
    await new Promise(r => setTimeout(r, 50));
  }

  // Update map with NPC icons
  console.log('\nUpdating map with NPC icons...');
  const ok = await updateMap(map.id, { npcs: updatedNpcs });
  console.log(ok ? '✅ Map updated with NPC icons' : '❌ Update failed');

  console.log('\n🎉 Done!');
}

main().catch(console.error);
