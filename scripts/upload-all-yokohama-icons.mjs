#!/usr/bin/env node
/**
 * Uploads NPC icons and Wild Digimon icons for ALL Yokohama Village area maps,
 * then updates each map entry to link icons to their respective NPC/Digimon entries.
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
const BASE = '/tmp/yokohama-icons';

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
  if (!existsSync(filePath)) {
    console.error(`  File not found: ${filePath}`);
    return null;
  }
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

// Map definitions: slug -> { npcIcons: {npcName: filename}, digimonIcons: {digimonName: filename}, folder }
const MAP_DATA = {
  'yokohama-village': {
    folder: 'yokohama-village',
    digimonIcons: {
      'Agumon (Repter-01)': 'Agumon_Search_Icon.png',
      'Upamon': 'Upamon_Search_Icon.png',
      'Drimogemon': 'Drimogemon_Search_Icon.png',
      'Kunemon': 'Kunemon_Search_Icon.png',
      'Flymon': 'Flymon_Search_Icon.png',
      'Renamon': 'Renamon_Search_Icon.png',
      'Elecmon': 'Elecmon_Search_Icon.png',
      'BlackGarurumon': 'BlackGarurumon_Search_Icon.png',
      'Tsunomon': 'Tsunomon_Search_Icon.png',
      'Koromon': 'Koromon_Search_Icon.png',
      'DemiMeramon': 'DemiMeramon_Search_Icon.png',
      'Meramon': 'Meramon_Search_Icon.png',
      'Keramon': 'Keramon_Search_Icon.png',
      'Chrysalimon': 'Chrysalimon_Search_Icon.png',
    },
    npcIcons: {}, // already uploaded
  },
  'yokohama-east-village': {
    folder: 'yokohama-east-village',
    digimonIcons: {
      'DemiMeramon': 'DemiMeramon_Search_Icon.png',
    },
    npcIcons: {},
  },
  'oil-refinery-1': {
    folder: 'oil-refinery-1',
    npcIcons: {
      'Repairman': 'Repairman_Icon.png',
    },
    digimonIcons: {
      'Kyubimon': 'Kyubimon_Search_Icon.png',
      'WereGarurumon': 'WereGarurumon_Search_Icon.png',
      'Dorugamon': 'Dorugamon_Search_Icon.png',
      'Asuramon': 'Asuramon_Search_Icon.png',
      'Knightmon': 'Knightmon_Search_Icon.png',
      'SkullGreymon': 'SkullGreymon_Search_Icon.png',
      'SkullSatamon': 'SkullSatamon_Search_Icon.png',
      'WaruMonzaemon': 'WaruMonzaemon_Search_Icon.png',
    },
  },
  'oil-refinery-2': {
    folder: 'oil-refinery-2',
    npcIcons: {
      'Repairman': 'Repairman_Icon.png',
      'Akihiro Kurata': 'Akihiro_Kurata_Icon.png',
      'Megumi Shirakawa': 'Megumi_Shirakawa_Icon.png',
      'Miki Kurosaki': 'Miki_Kurosaki_Icon.png',
    },
    digimonIcons: {
      'Kyubimon': 'Kyubimon_Search_Icon.png',
      'Guardromon': 'Guardromon_Search_Icon.png',
      'Veedramon': 'Veedramon_Search_Icon.png',
      'Waspmon': 'Waspmon_Search_Icon.png',
      'Sinduramon': 'Sinduramon_Search_Icon.png',
      'Volcamon': 'Volcamon_Search_Icon.png',
      'Meteormon': 'Meteormon_Search_Icon.png',
      'Cherrymon': 'Cherrymon_Search_Icon.png',
    },
  },
  'oil-refinery-3': {
    folder: 'oil-refinery-3',
    npcIcons: {},
    digimonIcons: {
      'Kyubimon': 'Kyubimon_Search_Icon.png',
      'NeoDevimon': 'NeoDevimon_Search_Icon.png',
      'Sangloupmon': 'Sangloupmon_Search_Icon.png',
      'Toyagumon': 'Toyagumon_Search_Icon.png',
      'Meteormon': 'Meteormon_Search_Icon.png',
      'SaberLeomon': 'SaberLeomon_Search_Icon.png',
      'Vikaralamon': 'Vikaralamon_Search_Icon.png',
      'DexDoruGreymon': 'DexDoruGreymon_Search_Icon.png',
      'Western Ruler SaberLeomon': 'Westen_Ruler_SaberLeomon_Search_Icon.png',
    },
  },
};

async function processMap(slug, config) {
  console.log(`\n=== ${slug} ===`);
  const map = await getMapBySlug(slug);
  if (!map) { console.error(`  Map not found: ${slug}`); return; }

  let needsUpdate = false;
  const payload = {};

  // Upload and link NPC icons
  if (Object.keys(config.npcIcons).length > 0 && map.npcs?.length > 0) {
    console.log('  Uploading NPC icons...');
    const updatedNpcs = [];
    for (const npc of map.npcs) {
      const iconFile = config.npcIcons[npc.name];
      if (iconFile) {
        const filePath = `${BASE}/${config.folder}/${iconFile}`;
        const iconId = await uploadImage(filePath, `${npc.name} icon`);
        if (iconId) {
          console.log(`    NPC ✅ ${npc.name}`);
          updatedNpcs.push({ name: npc.name, role: npc.role || '', icon: iconId });
          needsUpdate = true;
          continue;
        }
      }
      // Keep existing
      const existingIconId = typeof npc.icon === 'object' && npc.icon ? npc.icon.id : npc.icon;
      updatedNpcs.push({ name: npc.name, role: npc.role || '', icon: existingIconId || null });
    }
    payload.npcs = updatedNpcs;
  }

  // Upload and link Digimon icons
  if (Object.keys(config.digimonIcons).length > 0 && map.wildDigimon?.length > 0) {
    console.log('  Uploading Digimon icons...');
    const updatedDigimon = [];
    for (const d of map.wildDigimon) {
      const iconFile = config.digimonIcons[d.name];
      if (iconFile) {
        const filePath = `${BASE}/${config.folder}/${iconFile}`;
        const iconId = await uploadImage(filePath, `${d.name} icon`);
        if (iconId) {
          console.log(`    Digi ✅ ${d.name}`);
          updatedDigimon.push({
            name: d.name, level: d.level || '', element: d.element || '',
            attribute: d.attribute || '', icon: iconId,
          });
          needsUpdate = true;
          continue;
        }
      }
      // Keep existing
      const existingIconId = typeof d.icon === 'object' && d.icon ? d.icon.id : d.icon;
      updatedDigimon.push({
        name: d.name, level: d.level || '', element: d.element || '',
        attribute: d.attribute || '', icon: existingIconId || null,
      });
    }
    payload.wildDigimon = updatedDigimon;
  }

  if (needsUpdate) {
    console.log('  Updating map...');
    const ok = await updateMap(map.id, payload);
    console.log(ok ? '  ✅ Updated' : '  ❌ Failed');
  } else {
    console.log('  No changes needed');
  }
}

async function main() {
  await login();
  for (const [slug, config] of Object.entries(MAP_DATA)) {
    await processMap(slug, config);
  }
  console.log('\n🎉 All done!');
}

main().catch(console.error);
