#!/usr/bin/env node
/**
 * Creates all map placeholder entries in the CMS.
 * Run on the server: node scripts/create-maps.mjs
 */

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;

// ── All maps grouped by world → area ──────────────────────────────
const MAPS = [
  // ═══ REAL WORLD ═══
  // Yokohama Village
  { name: 'Yokohama Village', world: 'real-world', area: 'yokohama-village', mapType: 'town', sortOrder: 0 },
  { name: 'Yokohama East Village', world: 'real-world', area: 'yokohama-village', mapType: 'field', sortOrder: 1 },
  { name: 'Oil Refinery 1', world: 'real-world', area: 'yokohama-village', mapType: 'field', sortOrder: 2 },
  { name: 'Oil Refinery 2', world: 'real-world', area: 'yokohama-village', mapType: 'field', sortOrder: 3 },
  { name: 'Oil Refinery 3', world: 'real-world', area: 'yokohama-village', mapType: 'field', sortOrder: 4 },

  // DATS Center
  { name: 'DATS Center', world: 'real-world', area: 'dats-center', mapType: 'town', sortOrder: 0 },
  { name: 'D-Terminal B1', world: 'real-world', area: 'dats-center', mapType: 'field', sortOrder: 1 },
  { name: 'D-Terminal B2', world: 'real-world', area: 'dats-center', mapType: 'field', sortOrder: 2 },

  // Shinjuku
  { name: 'Shinjuku Western Area (Day)', world: 'real-world', area: 'shinjuku', mapType: 'field', sortOrder: 0 },
  { name: 'Shinjuku Western Area (Night)', world: 'real-world', area: 'shinjuku', mapType: 'field', sortOrder: 1 },
  { name: 'Shinjuku Eastern Area (Day)', world: 'real-world', area: 'shinjuku', mapType: 'field', sortOrder: 2 },
  { name: 'Shinjuku Eastern Area (Night)', world: 'real-world', area: 'shinjuku', mapType: 'field', sortOrder: 3 },
  { name: 'Stadium', world: 'real-world', area: 'shinjuku', mapType: 'dungeon', sortOrder: 4 },
  { name: 'Road', world: 'real-world', area: 'shinjuku', mapType: 'dungeon', sortOrder: 5 },

  // Shinjuku (D-Reaper)
  { name: 'Safe Area', world: 'real-world', area: 'shinjuku-d-reaper', mapType: 'town', sortOrder: 0 },
  { name: 'Shinjuku Park', world: 'real-world', area: 'shinjuku-d-reaper', mapType: 'field', sortOrder: 1 },
  { name: 'West Shinjuku (D-Reaper)', world: 'real-world', area: 'shinjuku-d-reaper', mapType: 'field', sortOrder: 2 },
  { name: 'D-Reaper Area', world: 'real-world', area: 'shinjuku-d-reaper', mapType: 'dungeon', sortOrder: 3 },
  { name: 'Shinjuku Park (D-Reaper)', world: 'real-world', area: 'shinjuku-d-reaper', mapType: 'dungeon', sortOrder: 4 },
  { name: 'Shinjuku Station', world: 'real-world', area: 'shinjuku-d-reaper', mapType: 'dungeon', sortOrder: 5 },

  // Tokyo Odaiba
  { name: 'Camp Site', world: 'real-world', area: 'tokyo-odaiba', mapType: 'town', sortOrder: 0 },
  { name: 'Valley of Light', world: 'real-world', area: 'tokyo-odaiba', mapType: 'field', sortOrder: 1 },
  { name: 'Shibuya', world: 'real-world', area: 'tokyo-odaiba', mapType: 'field', sortOrder: 2 },
  { name: 'Tokyo Tower', world: 'real-world', area: 'tokyo-odaiba', mapType: 'field', sortOrder: 3 },
  { name: 'Tokyo Tower Observatory', world: 'real-world', area: 'tokyo-odaiba', mapType: 'dungeon', sortOrder: 4 },
  { name: 'Minato City', world: 'real-world', area: 'tokyo-odaiba', mapType: 'field', sortOrder: 5 },
  { name: 'Odaiba', world: 'real-world', area: 'tokyo-odaiba', mapType: 'field', sortOrder: 6 },
  { name: 'Big Sight', world: 'real-world', area: 'tokyo-odaiba', mapType: 'field', sortOrder: 7 },
  { name: 'Fuji TV Rooftop', world: 'real-world', area: 'tokyo-odaiba', mapType: 'dungeon', sortOrder: 8 },
  { name: 'Venomous Vortex', world: 'real-world', area: 'tokyo-odaiba', mapType: 'dungeon', sortOrder: 9 },

  // ═══ DIGITAL WORLD ═══
  // Western Area
  { name: 'Western Village', world: 'digital-world', area: 'western-area', mapType: 'town', sortOrder: 0 },
  { name: 'Western Area (West)', world: 'digital-world', area: 'western-area', mapType: 'field', sortOrder: 1 },
  { name: 'Dark Tower Wasteland', world: 'digital-world', area: 'western-area', mapType: 'field', sortOrder: 2 },
  { name: 'Kaisers Laboratory', world: 'digital-world', area: 'western-area', mapType: 'dungeon', sortOrder: 3 },
  { name: 'Digimon Maze Entrance', world: 'digital-world', area: 'western-area', mapType: 'field', sortOrder: 4 },
  { name: 'Digimon Maze B1', world: 'digital-world', area: 'western-area', mapType: 'dungeon', sortOrder: 5 },
  { name: 'Digimon Maze B2', world: 'digital-world', area: 'western-area', mapType: 'dungeon', sortOrder: 6 },
  { name: 'Digimon Maze F1', world: 'digital-world', area: 'western-area', mapType: 'dungeon', sortOrder: 7 },
  { name: 'Digimon Maze F2', world: 'digital-world', area: 'western-area', mapType: 'dungeon', sortOrder: 8 },
  { name: 'Digimon Maze F3', world: 'digital-world', area: 'western-area', mapType: 'dungeon', sortOrder: 9 },
  { name: 'Digimon Maze F4', world: 'digital-world', area: 'western-area', mapType: 'dungeon', sortOrder: 10 },
  { name: 'Western Area (Outskirts)', world: 'digital-world', area: 'western-area', mapType: 'field', sortOrder: 11 },
  { name: 'Western Area (East)', world: 'digital-world', area: 'western-area', mapType: 'field', sortOrder: 12 },
  { name: 'Wilderness Area', world: 'digital-world', area: 'western-area', mapType: 'field', sortOrder: 13 },
  { name: 'Digimon Farm', world: 'digital-world', area: 'western-area', mapType: 'field', sortOrder: 14 },
  { name: 'Wind Valley', world: 'digital-world', area: 'western-area', mapType: 'field', sortOrder: 15 },
  { name: 'Ruined Historic', world: 'digital-world', area: 'western-area', mapType: 'field', sortOrder: 16 },

  // Glacier Area
  { name: 'Snowstorm Village', world: 'digital-world', area: 'glacier-area', mapType: 'town', sortOrder: 0 },
  { name: 'Frozen Ground', world: 'digital-world', area: 'glacier-area', mapType: 'field', sortOrder: 1 },
  { name: 'Snowman Village', world: 'digital-world', area: 'glacier-area', mapType: 'field', sortOrder: 2 },
  { name: 'Distorted Data Village', world: 'digital-world', area: 'glacier-area', mapType: 'field', sortOrder: 3 },
  { name: 'Infinite Ice Wall', world: 'digital-world', area: 'glacier-area', mapType: 'field', sortOrder: 4 },

  // Digimon Frontier
  { name: 'Digimon Frontier', world: 'digital-world', area: 'digimon-frontier', mapType: 'field', sortOrder: 0 },

  // New Digital World
  { name: 'Verdandi Terminal', world: 'digital-world', area: 'new-digital-world', mapType: 'town', sortOrder: 0 },
  { name: 'Royal Base', world: 'digital-world', area: 'new-digital-world', mapType: 'dungeon', sortOrder: 1 },

  // D-Terminal
  { name: 'D-Terminal', world: 'digital-world', area: 'd-terminal', mapType: 'town', sortOrder: 0 },

  // Digital Area
  { name: 'Wasteland Area', world: 'digital-world', area: 'digital-area', mapType: 'field', sortOrder: 0 },
  { name: 'Cloud Area', world: 'digital-world', area: 'digital-area', mapType: 'field', sortOrder: 1 },
  { name: 'Forest Area', world: 'digital-world', area: 'digital-area', mapType: 'field', sortOrder: 2 },
  { name: 'Ocean Area', world: 'digital-world', area: 'digital-area', mapType: 'field', sortOrder: 3 },
  { name: 'Chaotic Battlefield', world: 'digital-world', area: 'digital-area', mapType: 'dungeon', sortOrder: 4 },
  { name: 'Final Battle', world: 'digital-world', area: 'digital-area', mapType: 'dungeon', sortOrder: 5 },
  { name: 'Four Holy Beast Area', world: 'digital-world', area: 'digital-area', mapType: 'field', sortOrder: 6 },
  { name: 'Collapsed Four Holy Beast Area', world: 'digital-world', area: 'digital-area', mapType: 'field', sortOrder: 7 },
  { name: 'Zhuqiaomons Resting Area', world: 'digital-world', area: 'digital-area', mapType: 'field', sortOrder: 8 },
  { name: 'Four Holy Beast Area (D-Reaper)', world: 'digital-world', area: 'digital-area', mapType: 'field', sortOrder: 9 },
  { name: 'Wasteland Area (Night)', world: 'digital-world', area: 'digital-area', mapType: 'field', sortOrder: 10 },

  // Spiral Mountain
  { name: 'Forest of the Beginning', world: 'digital-world', area: 'spiral-mountain', mapType: 'field', sortOrder: 0 },
  { name: 'Forest of Marionette', world: 'digital-world', area: 'spiral-mountain', mapType: 'field', sortOrder: 1 },
  { name: 'Metal Empire', world: 'digital-world', area: 'spiral-mountain', mapType: 'field', sortOrder: 2 },
  { name: 'Underground City', world: 'digital-world', area: 'spiral-mountain', mapType: 'dungeon', sortOrder: 3 },
  { name: 'Back of the Empire', world: 'digital-world', area: 'spiral-mountain', mapType: 'field', sortOrder: 4 },
  { name: 'Stage of Clown', world: 'digital-world', area: 'spiral-mountain', mapType: 'field', sortOrder: 5 },
  { name: 'Void Space', world: 'digital-world', area: 'spiral-mountain', mapType: 'field', sortOrder: 6 },
  { name: 'Void Space (Dungeon)', world: 'digital-world', area: 'spiral-mountain', mapType: 'dungeon', sortOrder: 7 },
  { name: 'The Top Of A Nightmare', world: 'digital-world', area: 'spiral-mountain', mapType: 'field', sortOrder: 8 },
  { name: 'Front Yard of Marionette Mansion', world: 'digital-world', area: 'spiral-mountain', mapType: 'dungeon', sortOrder: 9 },
  { name: 'Marine Dragon Domain', world: 'digital-world', area: 'spiral-mountain', mapType: 'dungeon', sortOrder: 10 },

  // File Island
  { name: 'Village of the Beginning', world: 'digital-world', area: 'file-island', mapType: 'town', sortOrder: 0 },
  { name: 'Silver Lake', world: 'digital-world', area: 'file-island', mapType: 'field', sortOrder: 1 },
  { name: 'Silent Forest', world: 'digital-world', area: 'file-island', mapType: 'field', sortOrder: 2 },
  { name: 'Lost Historic Site', world: 'digital-world', area: 'file-island', mapType: 'field', sortOrder: 3 },
  { name: 'File Island Waterfront', world: 'digital-world', area: 'file-island', mapType: 'field', sortOrder: 4 },
  { name: 'Infinite Mountain', world: 'digital-world', area: 'file-island', mapType: 'field', sortOrder: 5 },
  { name: 'Infinite Mountain Dungeon', world: 'digital-world', area: 'file-island', mapType: 'dungeon', sortOrder: 6 },
  { name: 'Crack of Devimon', world: 'digital-world', area: 'file-island', mapType: 'dungeon', sortOrder: 7 },
  { name: 'Lake of the Beginning', world: 'digital-world', area: 'file-island', mapType: 'field', sortOrder: 8 },

  // Server Continent
  { name: 'Server Continent Desert', world: 'digital-world', area: 'server-continent', mapType: 'field', sortOrder: 0 },
  { name: 'Server Continent Canyon', world: 'digital-world', area: 'server-continent', mapType: 'field', sortOrder: 1 },
  { name: 'Server Continent Pyramid', world: 'digital-world', area: 'server-continent', mapType: 'field', sortOrder: 2 },
  { name: 'Datamon Maze', world: 'digital-world', area: 'server-continent', mapType: 'dungeon', sortOrder: 3 },

  // Xros Wars
  { name: 'Green Zone', world: 'digital-world', area: 'xros-wars', mapType: 'dungeon', sortOrder: 0 },
  { name: 'Miso Village', world: 'digital-world', area: 'xros-wars', mapType: 'dungeon', sortOrder: 1 },

  // Four Holy Beasts (Dungeons)
  { name: 'Xuanwumon Dungeon (EDG)', world: 'digital-world', area: 'four-holy-beasts', mapType: 'dungeon', sortOrder: 0 },
  { name: 'Zhuqiaomon Dungeon (ZDG)', world: 'digital-world', area: 'four-holy-beasts', mapType: 'dungeon', sortOrder: 1 },
  { name: 'Baihumon Dungeon (BDG)', world: 'digital-world', area: 'four-holy-beasts', mapType: 'dungeon', sortOrder: 2 },
  { name: 'Qinglongmon Dungeon (QDG)', world: 'digital-world', area: 'four-holy-beasts', mapType: 'dungeon', sortOrder: 3 },
  { name: 'Fanglongmon Dungeon (FDG)', world: 'digital-world', area: 'four-holy-beasts', mapType: 'dungeon', sortOrder: 4 },

  // Shadow Labyrinth
  { name: 'Shadow Labyrinth', world: 'digital-world', area: 'shadow-labyrinth', mapType: 'dungeon', sortOrder: 0 },

  // Kaisers Domain
  { name: 'Kaisers Domain', world: 'digital-world', area: 'kaisers-domain', mapType: 'field', sortOrder: 0 },
  { name: 'Kaisers Domain (Dungeon)', world: 'digital-world', area: 'kaisers-domain', mapType: 'dungeon', sortOrder: 1 },
];

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  // Login
  console.log('Logging in to CMS...');
  const loginRes = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status);
    process.exit(1);
  }
  const { token } = await loginRes.json();
  console.log('Logged in successfully');

  // Check existing maps
  const existingRes = await fetch(`${CMS_URL}/api/maps?limit=200&depth=0`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const existingData = await existingRes.json();
  const existingSlugs = new Set((existingData.docs || []).map(d => d.slug));
  console.log(`Found ${existingSlugs.size} existing maps`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const map of MAPS) {
    const slug = toSlug(map.name);

    if (existingSlugs.has(slug)) {
      // Update existing map with world/area fields
      const existing = existingData.docs.find(d => d.slug === slug);
      if (existing && (!existing.world || !existing.area)) {
        const updateRes = await fetch(`${CMS_URL}/api/maps/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
          body: JSON.stringify({ world: map.world, area: map.area, mapType: map.mapType, sortOrder: map.sortOrder, published: true }),
        });
        if (updateRes.ok) {
          console.log(`  ✏️  Updated: ${map.name}`);
        }
      } else {
        console.log(`  ⏭️  Skipped (exists): ${map.name}`);
      }
      skipped++;
      continue;
    }

    const body = {
      name: map.name,
      slug,
      world: map.world,
      area: map.area,
      mapType: map.mapType,
      sortOrder: map.sortOrder,
      published: true,
    };

    try {
      const res = await fetch(`${CMS_URL}/api/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        console.log(`  ✅ Created: ${map.name}`);
        created++;
      } else {
        const err = await res.text();
        console.error(`  ❌ Failed: ${map.name} — ${res.status}: ${err.substring(0, 200)}`);
        errors++;
      }
    } catch (e) {
      console.error(`  ❌ Error: ${map.name} — ${e.message}`);
      errors++;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch(console.error);
