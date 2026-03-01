#!/usr/bin/env node
/**
 * Updates Yokohama Village area maps with wiki data, uploads images, and links them.
 * Run on server: CMS_ADMIN_EMAIL=... CMS_ADMIN_PASSWORD=... CMS_INTERNAL_URL=... node scripts/update-yokohama-maps.mjs
 */
import { readFileSync } from 'fs';
import path from 'path';

const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
const IMG_BASE = '/tmp/yokohama-maps';

let TOKEN = '';

async function login() {
  const res = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error('Login failed: ' + res.status);
  const data = await res.json();
  TOKEN = data.token;
  console.log('Logged in');
}

async function uploadImage(filePath, altText) {
  const fullPath = path.resolve(filePath);
  const fileData = readFileSync(fullPath);
  const fileName = path.basename(fullPath);
  const ext = path.extname(fileName).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';

  // Build multipart manually
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const parts = [];

  // alt field
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="alt"\r\n\r\n${altText}`);

  // file field
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`);

  const header = Buffer.from(parts.join('\r\n') + '\r\n', 'utf-8');
  // We need to handle binary file data properly
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');

  // Combine: pre-file text, then binary file, then footer
  // Actually let's rebuild this properly with the alt part separate

  const preFile = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="alt"\r\n\r\n` +
    `${altText}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    `Content-Type: ${mime}\r\n\r\n`,
    'utf-8'
  );
  const postFile = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');

  const body = Buffer.concat([preFile, fileData, postFile]);

  const res = await fetch(`${CMS}/api/media`, {
    method: 'POST',
    headers: {
      Authorization: `JWT ${TOKEN}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`  Upload failed for ${fileName}: ${res.status} ${errText.substring(0, 200)}`);
    return null;
  }
  const data = await res.json();
  console.log(`  Uploaded: ${fileName} -> ${data.doc?.id}`);
  return data.doc?.id || null;
}

async function getMapBySlug(slug) {
  const res = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&limit=1&depth=0`, {
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
  if (!res.ok) {
    const errText = await res.text();
    console.error(`  Update failed: ${res.status} ${errText.substring(0, 200)}`);
    return false;
  }
  return true;
}

// ══════════════════════════════════════════════════════════════════════
// MAP DATA
// ══════════════════════════════════════════════════════════════════════

const YOKOHAMA_VILLAGE = {
  slug: 'yokohama-village',
  description: 'Due to the frequent appearance of Digimon, the DATS Center has classified this region as a specially monitored area.',
  levelRange: '1-16',
  mapType: 'town',
  images: {
    mapImage: `${IMG_BASE}/yokohama-village/New_Yokohama_Village_Map.png`,
  },
  gallery: [
    { file: `${IMG_BASE}/yokohama-village/Yokohama_Village1.png`, caption: 'Yokohama Village Loading Screen' },
  ],
  wildDigimon: [
    { name: 'Agumon (Repter-01)', level: '1-2', element: 'Fire', attribute: 'Vaccine' },
    { name: 'Upamon', level: '5-7', element: '', attribute: 'None' },
    { name: 'Drimogemon', level: '9-11', element: 'Land', attribute: 'Data' },
    { name: 'Kunemon', level: '7-9', element: 'Thunder', attribute: 'Virus' },
    { name: 'Flymon', level: '15-16', element: 'Wind', attribute: 'Virus' },
    { name: 'Renamon', level: '14-15', element: 'Wind', attribute: 'Data' },
    { name: 'Elecmon', level: '8-10', element: 'Thunder', attribute: 'Data' },
    { name: 'BlackGarurumon', level: '11-13', element: 'Ice', attribute: 'Virus' },
    { name: 'Tsunomon', level: '5-7', element: '', attribute: 'None' },
    { name: 'Koromon', level: '5-7', element: '', attribute: 'None' },
    { name: 'DemiMeramon', level: '6-8', element: 'Fire', attribute: 'None' },
    { name: 'Meramon', level: '13-15', element: 'Fire', attribute: 'Data' },
    { name: 'Keramon', level: '7-9', element: 'Pitch Black', attribute: 'Unknown' },
    { name: 'Chrysalimon', level: '14-16', element: 'Pitch Black', attribute: 'Unknown' },
  ],
  npcs: [
    { name: 'Yoshino Fujieda', role: 'DATS member' },
    { name: 'Kristy Damon', role: "Marcus Damon's sister" },
    { name: 'Sarah Damon', role: "Marcus Damon's mother" },
    { name: "Sora's Mom", role: 'Clothes shop' },
    { name: 'Megumi Shirakawa', role: 'Riding Agent' },
    { name: 'Miki Kurosaki', role: 'DATS member' },
    { name: 'Inoue Mama', role: 'Item seller' },
    { name: 'Michelle Krier', role: "Keenan Krier's mother" },
    { name: 'Takashi', role: 'Male student' },
    { name: 'Conner Shiratori', role: 'Mooncakes shop owner' },
    { name: 'Inoue Papa', role: 'Devoted husband' },
    { name: 'Vending Machine', role: 'Vending machine' },
    { name: 'Phonebooth', role: 'Public phone' },
    { name: 'Teacher Mori', role: 'School teacher' },
    { name: 'Asanuma', role: 'School teacher' },
    { name: 'Shiraki', role: "Hayase Harris' trainer" },
    { name: 'Vivi', role: 'Street cat' },
    { name: 'Homer Yushima', role: 'Unidentified old man' },
    { name: 'Carry', role: 'Disk seller' },
    { name: 'Akihiro Kurata', role: 'Doctor' },
    { name: 'Doruphin', role: 'Equipment Merge' },
    { name: 'PawnChessmon B', role: 'DATS member' },
    { name: 'PawnChessmon W', role: 'DATS member' },
    { name: 'DigimonArchive', role: 'DATS' },
    { name: 'Incubator', role: 'Hatch Digimon' },
  ],
};

const YOKOHAMA_EAST_VILLAGE = {
  slug: 'yokohama-east-village',
  description: 'An extension of Yokohama Village to the east, this area serves as a training ground for beginning Tamers and their partner Digimon.',
  levelRange: '3-10',
  mapType: 'field',
  images: {},
  gallery: [
    { file: `${IMG_BASE}/yokohama-east-village/Yokohama_East_Village1.png`, caption: 'Yokohama East Village Loading Screen' },
    { file: `${IMG_BASE}/yokohama-east-village/Yokohama_East_Village_(Christmas).png`, caption: 'Yokohama East Village (Christmas)' },
  ],
  wildDigimon: [],
  npcs: [],
};

const OIL_REFINERY_1 = {
  slug: 'oil-refinery-1',
  description: 'The first sector of the oil refinery complex near Yokohama Village. Stronger Digimon have been sighted prowling the industrial area.',
  levelRange: '20-35',
  mapType: 'field',
  images: {
    mapImage: `${IMG_BASE}/oil-refinery-1/Oil_Refinery-1.png`,
  },
  gallery: [
    { file: `${IMG_BASE}/oil-refinery-1/Oil_Refinery-1Load.png`, caption: 'Oil Refinery-1 Loading Screen' },
    { file: `${IMG_BASE}/oil-refinery-1/Real_World_-_Yokohama.png`, caption: 'Real World - Yokohama Area Map' },
  ],
  wildDigimon: [
    { name: 'Kyubimon', level: '20-22', element: 'Fire', attribute: 'Data' },
    { name: 'WereGarurumon', level: '25-27', element: 'Fire', attribute: 'Vaccine' },
    { name: 'SkullGreymon', level: '28-30', element: 'Pitch Black', attribute: 'Virus' },
    { name: 'Knightmon', level: '30-32', element: 'Steel', attribute: 'Data' },
    { name: 'Asuramon', level: '25-27', element: 'Fire', attribute: 'Vaccine' },
    { name: 'WaruMonzaemon', level: '22-24', element: 'Pitch Black', attribute: 'Virus' },
    { name: 'SkullSatamon', level: '30-32', element: 'Pitch Black', attribute: 'Virus' },
    { name: 'Dorugamon', level: '23-25', element: 'Fire', attribute: 'Data' },
  ],
  npcs: [
    { name: 'Repairman', role: 'Factory Worker' },
  ],
};

const OIL_REFINERY_2 = {
  slug: 'oil-refinery-2',
  description: 'The second sector of the refinery has attracted even more powerful Digimon. DATS agents are stationed here to manage the situation.',
  levelRange: '25-40',
  mapType: 'field',
  images: {
    mapImage: `${IMG_BASE}/oil-refinery-2/Oil_Refinery-2.png`,
  },
  gallery: [
    { file: `${IMG_BASE}/oil-refinery-2/Oil_Refinery-2Load.png`, caption: 'Oil Refinery-2 Loading Screen' },
  ],
  wildDigimon: [
    { name: 'Kyubimon', level: '25-27', element: 'Fire', attribute: 'Data' },
    { name: 'Guardromon', level: '26-28', element: 'Steel', attribute: 'Vaccine' },
    { name: 'Veedramon', level: '28-30', element: 'Wind', attribute: 'Vaccine' },
    { name: 'Waspmon', level: '30-32', element: 'Thunder', attribute: 'Virus' },
    { name: 'Sinduramon', level: '32-34', element: 'Thunder', attribute: 'Vaccine' },
    { name: 'Volcamon', level: '34-36', element: 'Fire', attribute: 'Data' },
    { name: 'Meteormon', level: '33-35', element: 'Land', attribute: 'Data' },
    { name: 'Cherrymon', level: '35-37', element: 'Wood', attribute: 'Virus' },
  ],
  npcs: [
    { name: 'Repairman', role: 'Factory Worker' },
    { name: 'Akihiro Kurata', role: 'Doctor' },
    { name: 'Megumi Shirakawa', role: 'DATS member' },
    { name: 'Miki Kurosaki', role: 'DATS member' },
  ],
};

const OIL_REFINERY_3 = {
  slug: 'oil-refinery-3',
  description: 'This place is the target of the Digimon that want to take revenge on humans because it has stored a lot of dangerous substances.',
  levelRange: '33-49',
  mapType: 'field',
  images: {
    mapImage: `${IMG_BASE}/oil-refinery-3/Oil_Refinery-3.png`,
  },
  gallery: [
    { file: `${IMG_BASE}/oil-refinery-3/Oil_Refinery-3Load.png`, caption: 'Oil Refinery-3 Loading Screen' },
    { file: `${IMG_BASE}/oil-refinery-3/Real_World_-_Yokohama.png`, caption: 'Real World - Yokohama Area Map' },
  ],
  wildDigimon: [
    { name: 'Kyubimon', level: '47-49', element: 'Fire', attribute: 'Data' },
    { name: 'Meteormon', level: '33-35', element: 'Land', attribute: 'Data' },
    { name: 'Sangloupmon', level: '38-40', element: 'Pitch Black', attribute: 'Virus' },
    { name: 'Vikaralamon', level: '37-39', element: 'Pitch Black', attribute: 'Vaccine' },
    { name: 'SaberLeomon', level: '40-42', element: 'Steel', attribute: 'Data' },
    { name: 'NeoDevimon', level: '39-41', element: 'Pitch Black', attribute: 'Virus' },
    { name: 'DexDoruGreymon', level: '41-43', element: 'Pitch Black', attribute: 'Virus' },
    { name: 'Westen Ruler SaberLeomon', level: 'Boss', element: 'Steel', attribute: 'Data' },
    { name: 'Toyagumon', level: '42-44', element: 'Fire', attribute: 'Vaccine' },
  ],
  npcs: [
    { name: 'Work Chief', role: 'Factory Worker' },
    { name: 'Oil Tank Repairman', role: 'Factory Worker' },
    { name: 'Gas Tank Repairman', role: 'Factory Worker' },
    { name: 'Accomodation Guard', role: 'Factory Worker' },
    { name: 'Akihiro Kurata', role: 'Doctor' },
    { name: 'Vending Machine', role: 'Food vending machine' },
    { name: 'Megumi Shirakawa', role: 'DATS member' },
    { name: 'Miki Kurosaki', role: 'DATS member' },
    { name: 'Incubator', role: 'Hatch Digimon' },
  ],
};

const ALL_MAPS = [YOKOHAMA_VILLAGE, YOKOHAMA_EAST_VILLAGE, OIL_REFINERY_1, OIL_REFINERY_2, OIL_REFINERY_3];

// ══════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════

async function processMap(mapData) {
  console.log(`\n=== ${mapData.slug} ===`);

  const doc = await getMapBySlug(mapData.slug);
  if (!doc) {
    console.error(`  Map not found: ${mapData.slug}`);
    return;
  }
  console.log(`  Found: ${doc.id}`);

  const payload = {
    description: mapData.description,
    levelRange: mapData.levelRange,
    mapType: mapData.mapType,
    wildDigimon: mapData.wildDigimon,
    npcs: mapData.npcs,
  };

  // Upload map image
  if (mapData.images.mapImage) {
    console.log('  Uploading map image...');
    const mapImageId = await uploadImage(mapData.images.mapImage, `${mapData.slug} map`);
    if (mapImageId) payload.mapImage = mapImageId;
  }

  // Upload gallery images
  if (mapData.gallery && mapData.gallery.length > 0) {
    console.log('  Uploading gallery...');
    const galleryItems = [];
    for (const g of mapData.gallery) {
      const imgId = await uploadImage(g.file, g.caption);
      if (imgId) galleryItems.push({ image: imgId, caption: g.caption });
    }
    if (galleryItems.length > 0) payload.gallery = galleryItems;
  }

  // Update
  console.log('  Updating map entry...');
  const ok = await updateMap(doc.id, payload);
  console.log(ok ? '  ✅ Updated successfully' : '  ❌ Update failed');
}

async function main() {
  await login();

  for (const mapData of ALL_MAPS) {
    await processMap(mapData);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n🎉 Done!');
}

main().catch(console.error);
