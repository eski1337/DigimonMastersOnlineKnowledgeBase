#!/usr/bin/env node
import { writeFileSync, unlinkSync, existsSync } from 'fs';
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
let TOKEN = '';

async function login() {
  const r = await fetch(`${CMS}/api/users/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:EMAIL,password:PASSWORD}) });
  TOKEN = (await r.json()).token; console.log('Logged in');
}

async function getMap(slug) {
  const r = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&limit=1&depth=2`, { headers:{Authorization:`JWT ${TOKEN}`} });
  return (await r.json()).docs?.[0] || null;
}

async function patchMap(id, payload) {
  const r = await fetch(`${CMS}/api/maps/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json',Authorization:`JWT ${TOKEN}`}, body:JSON.stringify(payload) });
  if (!r.ok) { console.error(`  PATCH fail: ${(await r.text()).slice(0,200)}`); return false; }
  return true;
}

async function downloadAndUpload(wikiPath, filename) {
  const url = `https://dmowiki.com${wikiPath}`;
  console.log(`  Downloading ${filename} from wiki...`);
  const r = await fetch(url);
  if (!r.ok) { console.error(`  Failed to download: ${url}`); return null; }
  const buf = Buffer.from(await r.arrayBuffer());
  const tmpPath = `/tmp/${filename}`;
  writeFileSync(tmpPath, buf);

  const form = new FormData();
  const blob = new Blob([buf], { type: 'image/png' });
  form.append('file', blob, filename);
  form.append('alt', filename.replace(/_/g,' ').replace('.png',''));

  const up = await fetch(`${CMS}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${TOKEN}` },
    body: form,
  });
  if (!up.ok) { console.error(`  Upload fail: ${(await up.text()).slice(0,200)}`); return null; }
  const doc = await up.json();
  console.log(`  ✅ Uploaded: ${doc.doc?.id || doc.id}`);
  if (existsSync(tmpPath)) unlinkSync(tmpPath);
  return doc.doc?.id || doc.id;
}

// Existing CMS icon IDs (from audit)
const EXISTING = {
  impmon_npc: '69a0d54e46c6588ae32187bb',       // Impmon_NPC_Icon-3.png (Devil Impmon)
  deputymon_search: '69a0d54e46c6588ae32187c3',  // Deputymon_Search_Icon-1.png
  greymon_search: '69a0d54e46c6588ae32187df',    // Greymon_Search_Icon.png
  saberleomon_search: '69a0cd9f46c6588ae3217f8d', // SaberLeomon_Search_Icon.png
  akihiro_kurata: '69a0d54e46c6588ae3218955',    // Akihiro_Kurata_Icon-9.png
  vending_machine: '69a0c7bd584602a8689e7d58',   // Vending_Machine_Icon-1.png
  megumi: '69a0cd9f46c6588ae3217f1b',            // Megumi_Shirakawa_Icon-2.png
  miki: '69a0cd9f46c6588ae3217f23',              // Miki_Kurosaki_Icon-1.png
  incubator: '69a0c7be584602a8689e7db7',         // Incubator_Icon-1.png
  repairman1: '69a0cd9f46c6588ae3217f0a',        // Repairman_Icon-1.png
  repairman2: '69a0cd9f46c6588ae3217ebf',        // Repairman_Icon.png
};

// Icons to download from wiki
const DOWNLOADS = {
  leomon_enemy:      '/images/0/0d/Leomon_Enemy.png',
  babamon_enemy:     '/images/a/a1/Babamon_Enemy.png',
  jijimon_enemy:     '/images/a/a7/Jijimon_Enemy.png',
  saberleomon_enemy: '/images/e/e6/Saberleomon_Enemy.png',
  icemon_search:     '/images/9/93/Icemon_Search_Icon.png',
};

async function main() {
  await login();

  // Step 1: Download missing icons from wiki
  console.log('\n=== DOWNLOADING MISSING ICONS ===');
  const uploaded = {};
  for (const [key, path] of Object.entries(DOWNLOADS)) {
    const filename = path.split('/').pop();
    uploaded[key] = await downloadAndUpload(path, filename);
  }
  console.log('\nUploaded IDs:', uploaded);

  // Step 2: Fix each map
  const fixes = [
    {
      slug: 'oil-refinery-3',
      digimonFixes: { 'Westen Ruler SaberLeomon': EXISTING.saberleomon_search },
      npcFixes: {
        'Akihiro Kurata': EXISTING.akihiro_kurata,
        'Vending Machine': EXISTING.vending_machine,
        'Megumi Shirakawa': EXISTING.megumi,
        'Miki Kurosaki': EXISTING.miki,
        'Incubator': EXISTING.incubator,
        'Oil Tank Repairman': EXISTING.repairman1,
        'Gas Tank Repairman': EXISTING.repairman2,
      },
    },
    {
      slug: 'western-area-outskirts',
      npcFixes: { '(Head) Leomon': uploaded.leomon_enemy },
    },
    {
      slug: 'western-area-east',
      digimonFixes: { 'Deputymon': EXISTING.deputymon_search },
      npcFixes: { 'Greymon of Justice': EXISTING.greymon_search },
    },
    {
      slug: 'wilderness-area',
      npcFixes: {
        'Devil Impmon': EXISTING.impmon_npc,
        '(Head) Leomon': uploaded.leomon_enemy,
        '(Injured) LeomonA': uploaded.leomon_enemy,
        '(Injured) LeomonB': uploaded.leomon_enemy,
        '(Injured) LeomonC': uploaded.leomon_enemy,
        '(Injured) LeomonD': uploaded.leomon_enemy,
      },
    },
    {
      slug: 'wind-valley',
      digimonFixes: { 'Icemon': uploaded.icemon_search },
      npcFixes: {
        'Babamon': uploaded.babamon_enemy,
        'Jijimon': uploaded.jijimon_enemy,
      },
    },
    {
      slug: 'ruined-historic',
      npcFixes: {
        '(Head) Leomon': uploaded.leomon_enemy,
        'Ruler SaberLeomon': uploaded.saberleomon_enemy,
        'Devil Impmon': EXISTING.impmon_npc,
      },
    },
  ];

  console.log('\n=== LINKING ICONS TO MAPS ===');
  for (const fix of fixes) {
    const map = await getMap(fix.slug);
    if (!map) { console.log(`❌ ${fix.slug}: NOT FOUND`); continue; }
    console.log(`\n--- ${map.name} (${fix.slug}) ---`);

    let changed = false;
    const digimon = map.wildDigimon || [];
    const npcs = map.npcs || [];

    // Fix digimon icons
    if (fix.digimonFixes) {
      for (const d of digimon) {
        const iconId = fix.digimonFixes[d.name];
        if (iconId && !(d.icon && (d.icon.id || d.icon))) {
          d.icon = iconId;
          console.log(`  🔗 Digimon "${d.name}" → ${iconId}`);
          changed = true;
        } else if (iconId && d.icon) {
          // Already has icon, but let's check if it's null
          const existing = typeof d.icon === 'object' ? d.icon.id : d.icon;
          if (!existing) {
            d.icon = iconId;
            console.log(`  🔗 Digimon "${d.name}" → ${iconId}`);
            changed = true;
          }
        }
      }
    }

    // Fix NPC icons
    if (fix.npcFixes) {
      for (const n of npcs) {
        const iconId = fix.npcFixes[n.name];
        if (iconId) {
          const existing = n.icon ? (typeof n.icon === 'object' ? n.icon.id : n.icon) : null;
          if (!existing) {
            n.icon = iconId;
            console.log(`  🔗 NPC "${n.name}" → ${iconId}`);
            changed = true;
          }
        }
      }
    }

    if (changed) {
      // Flatten icon refs for patch
      const patchDigimon = digimon.map(d => ({
        ...d,
        icon: d.icon ? (typeof d.icon === 'object' ? d.icon.id : d.icon) : undefined,
      }));
      const patchNpcs = npcs.map(n => ({
        ...n,
        icon: n.icon ? (typeof n.icon === 'object' ? n.icon.id : n.icon) : undefined,
      }));
      const ok = await patchMap(map.id, { wildDigimon: patchDigimon, npcs: patchNpcs });
      console.log(ok ? `  ✅ ${map.name} patched!` : `  ❌ Patch failed`);
    } else {
      console.log(`  ℹ️  No changes needed`);
    }
  }

  console.log('\n=== DONE ===');
}
main().catch(console.error);
