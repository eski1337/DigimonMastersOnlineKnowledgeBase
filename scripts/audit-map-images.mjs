#!/usr/bin/env node
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
let TOKEN = '';

async function login() {
  const r = await fetch(`${CMS}/api/users/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:EMAIL,password:PASSWORD}) });
  TOKEN = (await r.json()).token;
}

async function getMaps(area) {
  const r = await fetch(`${CMS}/api/maps?where[area][equals]=${area}&limit=50&depth=2`, { headers:{Authorization:`JWT ${TOKEN}`} });
  return (await r.json()).docs || [];
}

async function main() {
  await login();
  console.log('=== MAP IMAGE AUDIT ===\n');

  const areas = ['yokohama-village', 'western-area'];

  for (const area of areas) {
    const maps = await getMaps(area);
    console.log(`\n## ${area.toUpperCase()} (${maps.length} maps)\n`);

    for (const map of maps) {
      console.log(`--- ${map.name} (slug: ${map.slug}) ---`);

      // Main image
      const img = map.image;
      if (img && typeof img === 'object' && img.url) {
        console.log(`  ✅ Main image: ${img.filename || img.url}`);
      } else if (img) {
        console.log(`  ⚠️  Main image: ID ref only (${img})`);
      } else {
        console.log(`  ❌ Main image: MISSING`);
      }

      // Map image
      const mapImg = map.mapImage;
      if (mapImg && typeof mapImg === 'object' && mapImg.url) {
        console.log(`  ✅ Map image: ${mapImg.filename || mapImg.url}`);
      } else if (mapImg) {
        console.log(`  ⚠️  Map image: ID ref only (${mapImg})`);
      } else {
        console.log(`  ❌ Map image: MISSING`);
      }

      // Wild Digimon icons
      const digi = map.wildDigimon || [];
      let digiOk = 0, digiMissing = [];
      for (const d of digi) {
        const icon = d.icon;
        if (icon && typeof icon === 'object' && icon.url) {
          digiOk++;
        } else if (icon) {
          digiOk++; // ID ref exists
        } else {
          digiMissing.push(d.name);
        }
      }
      if (digiMissing.length === 0) {
        console.log(`  ✅ Digimon icons: ${digiOk}/${digi.length} OK`);
      } else {
        console.log(`  ❌ Digimon icons: ${digiOk}/${digi.length} OK, MISSING: ${digiMissing.join(', ')}`);
      }

      // NPC icons
      const npcs = map.npcs || [];
      let npcOk = 0, npcMissing = [];
      for (const n of npcs) {
        const icon = n.icon;
        if (icon && typeof icon === 'object' && icon.url) {
          npcOk++;
        } else if (icon) {
          npcOk++;
        } else {
          npcMissing.push(n.name);
        }
      }
      if (npcMissing.length === 0) {
        console.log(`  ✅ NPC icons: ${npcOk}/${npcs.length} OK`);
      } else {
        console.log(`  ❌ NPC icons: ${npcOk}/${npcs.length} OK, MISSING: ${npcMissing.join(', ')}`);
      }

      // Portals
      const portals = map.portals || [];
      console.log(`  📍 Portals: ${portals.length} (${portals.map(p => p.destinationSlug || p.destination).join(', ')})`);

      // Published
      console.log(`  📋 Published: ${map.published ? 'yes' : 'NO'}`);
      console.log('');
    }
  }
}
main().catch(console.error);
