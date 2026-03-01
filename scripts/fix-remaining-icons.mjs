#!/usr/bin/env node
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

// Use existing CMS icons as fallbacks
const ICONS = {
  leomon_search: '69a0d54d46c6588ae32186b5',       // Leomon_Search_Icon.png
  saberleomon_search: '69a0cd9f46c6588ae3217f8d',   // SaberLeomon_Search_Icon.png
  impmon_npc: '69a0d54e46c6588ae32187bb',            // Impmon_NPC_Icon-3.png
  jijimon: '69a09e788a33f5a32ae56583',               // Jijimon_Icon-1.png
  icemon: '69a09e788a33f5a32ae5653a',                // Icemon_Icon-1.png
};

const fixes = [
  {
    slug: 'western-area-outskirts',
    npcFixes: { '(Head) Leomon': ICONS.leomon_search },
  },
  {
    slug: 'wilderness-area',
    npcFixes: {
      '(Head) Leomon': ICONS.leomon_search,
      '(Injured) LeomonA': ICONS.leomon_search,
      '(Injured) LeomonB': ICONS.leomon_search,
      '(Injured) LeomonC': ICONS.leomon_search,
      '(Injured) LeomonD': ICONS.leomon_search,
    },
  },
  {
    slug: 'wind-valley',
    digimonFixes: { 'Icemon': ICONS.icemon },
    npcFixes: {
      'Jijimon': ICONS.jijimon,
      // Babamon: no icon available in CMS
    },
  },
  {
    slug: 'ruined-historic',
    npcFixes: {
      '(Head) Leomon': ICONS.leomon_search,
      'Ruler SaberLeomon': ICONS.saberleomon_search,
    },
  },
];

async function main() {
  await login();

  for (const fix of fixes) {
    const map = await getMap(fix.slug);
    if (!map) { console.log(`❌ ${fix.slug}: NOT FOUND`); continue; }
    console.log(`\n--- ${map.name} (${fix.slug}) ---`);

    let changed = false;
    const digimon = (map.wildDigimon || []).map(d => ({
      ...d,
      icon: d.icon ? (typeof d.icon === 'object' ? d.icon.id : d.icon) : null,
    }));
    const npcs = (map.npcs || []).map(n => ({
      ...n,
      icon: n.icon ? (typeof n.icon === 'object' ? n.icon.id : n.icon) : null,
    }));

    if (fix.digimonFixes) {
      for (const d of digimon) {
        if (fix.digimonFixes[d.name] && !d.icon) {
          d.icon = fix.digimonFixes[d.name];
          console.log(`  🔗 Digimon "${d.name}" → ${d.icon}`);
          changed = true;
        }
      }
    }
    if (fix.npcFixes) {
      for (const n of npcs) {
        if (fix.npcFixes[n.name] && !n.icon) {
          n.icon = fix.npcFixes[n.name];
          console.log(`  🔗 NPC "${n.name}" → ${n.icon}`);
          changed = true;
        }
      }
    }

    if (changed) {
      const ok = await patchMap(map.id, { wildDigimon: digimon, npcs });
      console.log(ok ? `  ✅ Patched!` : `  ❌ Patch failed`);
    } else {
      console.log(`  ℹ️  No changes needed`);
    }
  }
}
main().catch(console.error);
