/**
 * Upload Digimon icons from local folder and auto-match to CMS Digimon entries.
 * Usage: node scripts/upload-icons.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CMS_URL = 'https://cms.dmokb.info';
const ICONS_DIR = path.resolve(__dirname, '..', 'Digimon Icons');
const EMAIL = 'svc@dmokb.info';
const PASSWORD = 'DmokbService2026SecurePass';

/* ── Helpers ─────────────────────────────────────────────────────────── */

function normalizeIconName(filename) {
  let name = filename
    .replace(/\.png$/i, '')
    .replace(/\.webp$/i, '')
    .replace(/_Icon$/i, '')
    .replace(/_icon$/i, '');
  
  // Replace underscores with spaces
  name = name.replace(/_/g, ' ');
  // Replace parentheses content formatting
  name = name.replace(/\(/g, '(').replace(/\)/g, ')');
  
  return name.trim();
}

function normalizeForMatch(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/* ── Main ────────────────────────────────────────────────────────────── */

async function main() {
  // 1. Login
  console.log('Logging in...');
  const loginRes = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  console.log('Logged in successfully.');

  // 2. Fetch ALL digimon
  console.log('Fetching all Digimon...');
  const allDigimon = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${CMS_URL}/api/digimon?limit=100&page=${page}&depth=0&sort=name`, {
      headers: { Authorization: `JWT ${token}` },
    });
    const data = await res.json();
    allDigimon.push(...(data.docs || []));
    if (!data.hasNextPage) break;
    page++;
  }
  console.log(`Found ${allDigimon.length} Digimon in CMS.`);

  // Build lookup: normalized name -> digimon doc
  const digimonByNorm = new Map();
  for (const d of allDigimon) {
    const norm = normalizeForMatch(d.name);
    digimonByNorm.set(norm, d);
  }

  // 3. List icon files
  const files = fs.readdirSync(ICONS_DIR).filter(f => 
    (f.endsWith('.png') || f.endsWith('.webp')) && 
    !['Burst_Mode.png', 'KDMO_Exclusive.png', 'Side_Mega.png'].includes(f)
  );
  console.log(`Found ${files.length} icon files.`);

  // 4. Match and upload
  let matched = 0;
  let skipped = 0;
  let failed = 0;
  let alreadyHasIcon = 0;

  for (const file of files) {
    const iconName = normalizeIconName(file);
    const norm = normalizeForMatch(iconName);
    
    let digimon = digimonByNorm.get(norm);
    
    // Try alternate match strategies if direct match fails
    if (!digimon) {
      // Try without (C) suffix
      const normNoC = norm.replace(/c$/, '');
      if (normNoC !== norm) digimon = digimonByNorm.get(normNoC);
    }
    if (!digimon) {
      // Try with common name variations
      // "Omnimon" -> "Omegamon", etc. handled by normalized matching
      // Try fuzzy: find closest match
      for (const [key, d] of digimonByNorm) {
        if (key.includes(norm) || norm.includes(key)) {
          // Only accept if difference is small
          if (Math.abs(key.length - norm.length) <= 3) {
            digimon = d;
            break;
          }
        }
      }
    }

    if (!digimon) {
      console.log(`  SKIP: No match for "${iconName}" (${file})`);
      skipped++;
      continue;
    }

    // Check if already has icon
    if (digimon.icon) {
      console.log(`  ALREADY: ${digimon.name} already has an icon, skipping.`);
      alreadyHasIcon++;
      continue;
    }

    // Upload the icon file to media
    const filePath = path.join(ICONS_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: file.endsWith('.webp') ? 'image/webp' : 'image/png' });
    
    const formData = new FormData();
    formData.append('file', blob, file);
    formData.append('alt', `${digimon.name} Icon`);

    try {
      const uploadRes = await fetch(`${CMS_URL}/api/media`, {
        method: 'POST',
        headers: { Authorization: `JWT ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      const mediaId = uploadData.doc?.id;
      
      if (!mediaId) {
        console.log(`  FAIL upload for ${digimon.name}: ${JSON.stringify(uploadData).slice(0, 200)}`);
        failed++;
        continue;
      }

      // Update the Digimon's icon field
      const updateRes = await fetch(`${CMS_URL}/api/digimon/${digimon.id}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `JWT ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ icon: mediaId }),
      });
      const updateData = await updateRes.json();
      
      if (updateData.doc || updateData.id) {
        console.log(`  OK: ${file} → ${digimon.name}`);
        matched++;
      } else {
        console.log(`  FAIL update for ${digimon.name}: ${JSON.stringify(updateData).slice(0, 200)}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ERROR: ${digimon.name}: ${err.message}`);
      failed++;
    }

    // Small delay to avoid overwhelming the server
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n=== Done ===`);
  console.log(`Matched & uploaded: ${matched}`);
  console.log(`Already had icon: ${alreadyHasIcon}`);
  console.log(`No match found: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
