/**
 * Populate Wild Digimon data from parsed wiki JSON (exact HP values).
 *
 * Usage:
 *   CMS_ADMIN_EMAIL=<email> CMS_ADMIN_PASSWORD=<pass> CMS_INTERNAL_URL=http://localhost:3001 node scripts/populate-from-json.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASS = process.env.CMS_ADMIN_PASSWORD;

if (!EMAIL || !PASS) {
  console.error('Set CMS_ADMIN_EMAIL and CMS_ADMIN_PASSWORD');
  process.exit(1);
}

async function main() {
  // Load parsed data
  const dataPath = path.join(__dirname, 'wild-digimon-data.json');
  const MAP_DATA = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded data for ${Object.keys(MAP_DATA).length} maps.`);

  // Login
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status);
    process.exit(1);
  }
  const { token } = await loginRes.json();
  console.log('Logged in.');

  // Fetch all maps
  const mapsRes = await fetch(`${CMS}/api/maps?limit=200&depth=0`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const mapsData = await mapsRes.json();
  const allMaps = mapsData.docs || [];
  console.log(`Found ${allMaps.length} maps in CMS.`);

  let updated = 0;
  let skipped = 0;

  for (const map of allMaps) {
    const data = MAP_DATA[map.slug];
    if (!data) {
      skipped++;
      continue;
    }

    const res = await fetch(`${CMS}/api/maps/${map.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ wildDigimon: data }),
    });

    if (res.ok) {
      console.log(`  ✓ ${map.slug}: ${data.length} entries`);
      updated++;
    } else {
      const err = await res.text();
      console.error(`  ✗ ${map.slug}: ${res.status} ${err.slice(0, 100)}`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped} (no wiki data)`);
}

main().catch(console.error);
