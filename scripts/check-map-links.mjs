#!/usr/bin/env node
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const WEB = process.env.WEB_URL || 'http://localhost:3000';

async function main() {
  // 1. Get all maps from CMS
  const res = await fetch(`${CMS}/api/maps?limit=200&depth=0`);
  const data = await res.json();
  console.log(`CMS has ${data.totalDocs} maps total\n`);

  // Focus on Western Area + Yokohama + DATS maps
  const focusSlugs = [
    'dats-center', 'yokohama-village', 'yokohama-east-village',
    'oil-refinery-1', 'oil-refinery-2', 'oil-refinery-3',
    'western-village', 'western-area-outskirts', 'western-area-east',
    'digimon-farm', 'wilderness-area', 'wind-valley', 'ruined-historic',
    'western-area-west', 'dark-tower-wasteland',
    'digimon-maze-entrance', 'digimon-maze-b2', 'digimon-maze-b1',
    'digimon-maze-f1', 'digimon-maze-f2', 'digimon-maze-f3', 'digimon-maze-f4',
  ];

  console.log('═══ POPULATED MAPS STATUS ═══\n');
  for (const slug of focusSlugs) {
    const m = data.docs.find(d => d.slug === slug);
    if (!m) {
      console.log(`❌ ${slug} — NOT FOUND IN CMS`);
      continue;
    }
    const digiCount = m.wildDigimon?.length || 0;
    const npcCount = m.npcs?.length || 0;
    const portalCount = m.portals?.length || 0;
    const missingDigiIcons = (m.wildDigimon || []).filter(d => !d.icon).length;
    const missingNpcIcons = (m.npcs || []).filter(n => !n.icon).length;

    const status = [
      m.published ? '✅' : '❌unpub',
      m.image ? '🖼img' : '⚠noImg',
      m.mapImage ? '🗺map' : '—',
      `${digiCount}digi${missingDigiIcons > 0 ? `(${missingDigiIcons}⚠)` : ''}`,
      `${npcCount}npc${missingNpcIcons > 0 ? `(${missingNpcIcons}⚠)` : ''}`,
      `${portalCount}ptl`,
    ].join(' ');
    console.log(`  ${slug.padEnd(28)} ${status}`);
  }

  // 2. Check web frontend for each map
  console.log('\n═══ WEB FRONTEND CHECK ═══\n');
  let webOk = 0, webFail = 0;
  for (const slug of focusSlugs) {
    try {
      const r = await fetch(`${WEB}/maps/${slug}`, { redirect: 'manual' });
      if (r.status === 200) {
        webOk++;
        console.log(`  ✅ /maps/${slug} → 200`);
      } else {
        webFail++;
        console.log(`  ❌ /maps/${slug} → ${r.status}`);
      }
    } catch (e) {
      webFail++;
      console.log(`  ❌ /maps/${slug} → ${e.message}`);
    }
  }
  console.log(`\nWeb: ${webOk} ok, ${webFail} fail`);

  // 3. Check /maps listing page
  try {
    const r = await fetch(`${WEB}/maps`);
    console.log(`\n/maps listing page: ${r.status}`);
  } catch (e) {
    console.log(`\n/maps listing page: ${e.message}`);
  }
}

main().catch(console.error);
