// Upload remaining unmatched loading screens to CMS maps
import { readFileSync } from 'fs';
import path from 'path';

const CMS = 'http://localhost:3001';
const IMG_DIR = '/home/deploy/app/loading-screens';

const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
const loginR = await fetch(`${CMS}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const loginD = await loginR.json();
const token = loginD.token;
if (!token) { console.error('Login failed'); process.exit(1); }
console.log('✅ Logged in');

// Additional filename -> CMS slug mappings for unmatched files
const REMAINING = {
  'Loading_BigSight.png': 'big-sight',
  'Loading_104.png': 'big-sight',
  'Loading_Minato.png': 'minato-city',
  'Loading_101.png': 'minato-city',
  'Loading_DarkTower.png': 'dark-tower-wasteland',
  'loading_27.png': 'dark-tower-wasteland',
  'Loading_BDG.png': 'baihumon-dungeon-bdg',
  'Loading_EDG.png': 'xuanwumon-dungeon-edg',
  'Loading_FDG.png': 'fanglongmon-dungeon-fdg',
  'Loading_QDG.png': 'qinglongmon-dungeon-qdg',
  'Loading_ZDG.png': 'zhuqiaomon-dungeon-zdg',
  'Loading_VenomousVortex.png': 'venomous-vortex',
  'Loading_Underground-Summon-Square.png': 'underground-city',
  'Loading_KaisersLabEasy.png': 'kaisers-laboratory',
  'Loading_KaisersLabNormal.png': 'kaisers-laboratory',
  'loading_KaisersLabHard.png': 'kaisers-domain-dungeon',
};

// Fetch all maps for ID lookup
const mapsR = await fetch(`${CMS}/api/maps?limit=200&depth=0`, {
  headers: { Authorization: `JWT ${token}` },
});
const mapsD = await mapsR.json();
const slugToMap = {};
for (const m of mapsD.docs) {
  slugToMap[m.slug] = m;
}

// Deduplicate: prefer named files over numbered for same slug
const bestBySlug = {};
for (const [file, slug] of Object.entries(REMAINING)) {
  const isNumbered = /^[Ll]oading_?\d+\.png$/.test(file);
  if (!bestBySlug[slug] || (bestBySlug[slug].isNumbered && !isNumbered)) {
    bestBySlug[slug] = { file, slug, isNumbered };
  }
}

let uploaded = 0;
let errors = 0;

for (const { file, slug } of Object.values(bestBySlug)) {
  const map = slugToMap[slug];
  if (!map) {
    console.log(`  ⚠️ Map not found: ${slug} (for ${file})`);
    continue;
  }

  const filePath = path.join(IMG_DIR, file);
  try {
    const fileData = readFileSync(filePath);
    const formData = new FormData();
    const blob = new Blob([fileData], { type: 'image/png' });
    formData.append('file', blob, file);
    formData.append('alt', `${map.name} Loading Screen`);
    formData.append('imageType', 'map-loading');
    formData.append('source', 'DMO Game Client');
    formData.append('credits', 'Joymax / MOVE Games');

    const uploadR = await fetch(`${CMS}/api/media`, {
      method: 'POST',
      headers: { Authorization: `JWT ${token}` },
      body: formData,
    });

    if (!uploadR.ok) {
      const err = await uploadR.text();
      console.log(`  ❌ Upload failed for ${file}: ${err.substring(0, 200)}`);
      errors++;
      continue;
    }

    const media = await uploadR.json();
    const mediaId = media.doc?.id || media.id;
    console.log(`  📤 Uploaded ${file} -> media ID: ${mediaId}`);

    const patchR = await fetch(`${CMS}/api/maps/${map.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ image: mediaId }),
    });

    if (patchR.ok) {
      console.log(`  ✅ Linked to map: ${map.name} (${slug})`);
      uploaded++;
    } else {
      const err = await patchR.text();
      console.log(`  ❌ Patch failed for ${map.name}: ${err.substring(0, 200)}`);
      errors++;
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    errors++;
  }
}

console.log(`\n=== DONE ===`);
console.log(`Uploaded & linked: ${uploaded}`);
console.log(`Errors: ${errors}`);

// Show summary of all maps with/without images
console.log('\n=== MAP IMAGE STATUS ===');
const updatedMapsR = await fetch(`${CMS}/api/maps?limit=200&depth=0`, {
  headers: { Authorization: `JWT ${token}` },
});
const updatedMaps = await updatedMapsR.json();
let withImage = 0, withoutImage = 0;
for (const m of updatedMaps.docs.sort((a, b) => a.name.localeCompare(b.name))) {
  if (m.image) {
    withImage++;
  } else {
    console.log(`  ❌ No image: ${m.name} (${m.slug})`);
    withoutImage++;
  }
}
console.log(`\n✅ Maps with image: ${withImage}`);
console.log(`❌ Maps without image: ${withoutImage}`);
