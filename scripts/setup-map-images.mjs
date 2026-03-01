/**
 * Upload map images to CMS media and link them to their respective map entries.
 *
 * Usage:
 *   CMS_ADMIN_EMAIL=<email> CMS_ADMIN_PASSWORD=<pass> CMS_INTERNAL_URL=http://localhost:3001 node scripts/setup-map-images.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASS = process.env.CMS_ADMIN_PASSWORD;
const MAPS_ROOT = path.resolve(__dirname, '..', 'Maps');

if (!EMAIL || !PASS) { console.error('Set CMS_ADMIN_EMAIL and CMS_ADMIN_PASSWORD'); process.exit(1); }

// folder name → CMS slug
const FOLDER_TO_SLUG = {
  // File Island
  'Ancient Ruins of Secret': 'lost-historic-site',
  'Crack of Devimon': 'crack-of-devimon',
  'File Island Waterfront': 'file-island-waterfront',
  'Infinite Mountain': 'infinite-mountain',
  'Infinite Mountain Dungeon': 'infinite-mountain-dungeon',
  'Lake of the Beginning': 'lake-of-the-beginning',
  'Lost Historic Site': 'lost-historic-site',
  'Silent Forest': 'silent-forest',
  'Silver Lake': 'silver-lake',
  'Village of Beginnings': 'village-of-the-beginning',
  // Server Continent
  'Datamon Maze': 'datamon-maze',
  'Server Continent Canyon': 'server-continent-canyon',
  'Server Continent Desert': 'server-continent-desert',
  'Server Continent Pyramid': 'server-continent-pyramid',
  // Tokyo Odaiba
  'Big Sight': 'big-sight',
  'Camp Site': 'camp-site',
  'Minato City': 'minato-city',
  'Odaiba': 'odaiba',
  'Shibuya': 'shibuya',
  'Tokyo Tower': 'tokyo-tower',
  'Tokyo Tower Observatory': 'tokyo-tower-observatory',
  'Valley of Light': 'valley-of-light',
};

// Patterns for main map images (named after the map)
function isMainImage(filename, folderName) {
  const base = path.basename(filename, path.extname(filename));
  const normalized = folderName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const fileNorm = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  // Exact match or match without trailing number
  return fileNorm === normalized || fileNorm === normalized + '1' || fileNorm === normalized + '2';
}

function isLoadingScreen(filename) {
  const lower = filename.toLowerCase();
  return lower.includes('loading') || lower.includes('_load');
}

function isMapImage(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
}

async function uploadMedia(filePath, token) {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const blob = new Blob([fileBuffer], { type: getMimeType(fileName) });
  formData.append('file', blob, fileName);
  formData.append('alt', fileName.replace(/[_-]/g, ' ').replace(/\.\w+$/, ''));

  const res = await fetch(`${CMS}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`    UPLOAD FAIL ${fileName}: ${res.status} ${err.slice(0, 200)}`);
    return null;
  }

  const data = await res.json();
  return data.doc || data;
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
  return types[ext] || 'application/octet-stream';
}

async function main() {
  // Login
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (!loginRes.ok) { console.error('Login failed:', loginRes.status); process.exit(1); }
  const { token } = await loginRes.json();
  console.log('Logged in.');

  // Fetch all maps
  const mapsRes = await fetch(`${CMS}/api/maps?limit=200&depth=0`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const mapsData = await mapsRes.json();
  const slugToId = {};
  for (const m of mapsData.docs || []) slugToId[m.slug] = m.id;
  console.log(`Found ${Object.keys(slugToId).length} maps in CMS.\n`);

  // Scan all map folders
  const regionDirs = [
    path.join(MAPS_ROOT, 'FileIsland', 'File Island'),
    path.join(MAPS_ROOT, 'ServerContinent', 'Server Continent'),
    path.join(MAPS_ROOT, 'TokyoOdaiba', 'Tokyo Odaiba'),
  ];

  let totalUploaded = 0;
  let totalLinked = 0;

  for (const regionDir of regionDirs) {
    if (!fs.existsSync(regionDir)) { console.log(`SKIP region: ${regionDir}`); continue; }

    const folders = fs.readdirSync(regionDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const folder of folders) {
      const slug = FOLDER_TO_SLUG[folder];
      if (!slug) { console.log(`  SKIP folder (no slug mapping): ${folder}`); continue; }

      const mapId = slugToId[slug];
      if (!mapId) { console.log(`  SKIP ${folder} → ${slug} (not in CMS)`); continue; }

      const folderPath = path.join(regionDir, folder);
      const allFiles = fs.readdirSync(folderPath).filter(f => isMapImage(f));

      if (allFiles.length === 0) { console.log(`  SKIP ${folder} (no images)`); continue; }

      console.log(`\n📍 ${folder} → ${slug} (${allFiles.length} images)`);

      // Categorize images
      let mainImageFile = null;
      let loadingFile = null;
      const galleryFiles = [];

      for (const file of allFiles) {
        if (!mainImageFile && isMainImage(file, folder)) {
          mainImageFile = file;
        } else if (!loadingFile && isLoadingScreen(file)) {
          loadingFile = file;
        } else {
          galleryFiles.push(file);
        }
      }

      // If no main image found, try the first large image that's not an icon
      if (!mainImageFile) {
        const nonIconFiles = allFiles.filter(f =>
          !f.includes('_Search_Icon') && !f.includes('_Icon.') &&
          !f.includes('Monster_Card') && !f.includes('Chicken_Combo') &&
          !f.includes('Digiclon_Box') && !f.includes('Chipset_Box')
        );
        if (nonIconFiles.length > 0) {
          mainImageFile = nonIconFiles[0];
          // Remove from gallery if it was there
          const idx = galleryFiles.indexOf(mainImageFile);
          if (idx >= 0) galleryFiles.splice(idx, 1);
        }
      }

      // Upload main image
      let mainMediaId = null;
      if (mainImageFile) {
        console.log(`  Main: ${mainImageFile}`);
        const media = await uploadMedia(path.join(folderPath, mainImageFile), token);
        if (media) { mainMediaId = media.id; totalUploaded++; }
      }

      // Upload loading screen as mapImage
      let mapImageId = null;
      if (loadingFile) {
        console.log(`  Loading: ${loadingFile}`);
        const media = await uploadMedia(path.join(folderPath, loadingFile), token);
        if (media) { mapImageId = media.id; totalUploaded++; }
      }

      // Upload gallery images (skip small icons / search icons for cleaner gallery)
      const galleryItems = [];
      for (const file of galleryFiles) {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);
        // Skip tiny icons under 10KB unless they're actual map screenshots
        const isSmallIcon = stat.size < 10000 && (file.includes('Icon') || file.includes('icon'));
        if (isSmallIcon) continue;

        console.log(`  Gallery: ${file}`);
        const media = await uploadMedia(filePath, token);
        if (media) {
          galleryItems.push({ image: media.id, caption: file.replace(/[_-]/g, ' ').replace(/\.\w+$/, '') });
          totalUploaded++;
        }
      }

      // Patch the map entry
      const patch = {};
      if (mainMediaId) patch.image = mainMediaId;
      if (mapImageId) patch.mapImage = mapImageId;
      if (galleryItems.length > 0) patch.gallery = galleryItems;

      if (Object.keys(patch).length > 0) {
        const patchRes = await fetch(`${CMS}/api/maps/${mapId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
          body: JSON.stringify(patch),
        });
        if (patchRes.ok) {
          console.log(`  ✓ Linked to ${slug}: main=${!!mainMediaId}, mapImage=${!!mapImageId}, gallery=${galleryItems.length}`);
          totalLinked++;
        } else {
          console.error(`  ✗ PATCH failed for ${slug}: ${patchRes.status}`);
        }
      }
    }
  }

  console.log(`\n\nDone! Uploaded: ${totalUploaded} images, Linked: ${totalLinked} maps`);
}

main().catch(console.error);
