// Create "Ancient Ruins of Secret" map in CMS from parsed txt data
const CMS = 'http://localhost:3001';

async function main() {
  // Login
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  const { token } = await loginRes.json();
  if (!token) { console.error('Login failed'); process.exit(1); }

  // Check if already exists
  const checkRes = await fetch(`${CMS}/api/maps?where[slug][equals]=ancient-ruins-of-secret&limit=1`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const existing = await checkRes.json();
  if (existing.totalDocs > 0) {
    console.log('Map already exists, updating...');
  }

  const mapData = {
    name: 'Ancient Ruins of Secret',
    slug: 'ancient-ruins-of-secret',
    published: true,
    world: 'digital-world',
    area: 'file-island',
    region: 'File Island',
    mapType: 'field',
    levelRange: '50-90',
    description: 'Ancient site where hidden secret of File Island',
    wildDigimon: [
      { name: 'Knightmon', behavior: 'aggressive', attribute: 'Data', element: 'Steel', hp: '67200', level: '80-81' },
      { name: 'Mystimon', behavior: 'aggressive', attribute: 'Virus', element: 'Fire', hp: '100800', level: '80-81' },
      { name: 'Parasimon', variant: 'Breath of Decay', behavior: 'defensive', attribute: 'Virus', element: 'Pitch Black', hp: '80000', level: '80' },
      { name: 'Parasimon', variant: 'Breath of Decay', behavior: 'aggressive', hp: '120000', level: '80-81' },
      { name: 'Garudamon', variant: 'Brave Fellowship', behavior: 'aggressive', attribute: 'Virus', element: 'Fire', hp: '96000', level: '80' },
      { name: 'Volcamon', behavior: 'aggressive', attribute: 'Data', element: 'Pitch Black', hp: '80000', level: '80' },
      { name: 'Volcamon', variant: 'Digital', behavior: 'aggressive', attribute: 'Data', element: 'Pitch Black', hp: '128000', level: '80' },
      { name: 'Dracmon', behavior: 'aggressive', attribute: 'Virus', element: 'Pitch Black', hp: '60000', level: '50' },
      { name: 'Roachmon', variant: 'Snaggle Tooth', behavior: 'aggressive', attribute: 'Virus', element: 'Pitch Black', hp: '25000', level: '80-81' },
      { name: 'Tanemon', variant: 'Seed of Luck', behavior: 'defensive', attribute: 'None', element: 'Wood', hp: '100', level: 'BOSS' },
      { name: 'Centarumon', behavior: 'defensive', attribute: 'Data', element: 'Fire' },
      { name: 'Centarumon', variant: 'Raid', behavior: 'aggressive', hp: '980000', level: '90' },
      { name: 'Leomon', variant: 'Ancient Site Destroyer', behavior: 'defensive', attribute: 'Vaccine', element: 'Fire' },
      { name: 'Leomon', variant: 'Raid', behavior: 'aggressive', hp: '1100000', level: '90' },
    ],
    npcs: [
      { name: 'Palmon', role: 'Searching Friends' },
      { name: 'Tentomon', role: 'Lost' },
      { name: 'Mimi', role: 'Lost' },
      { name: 'DemiDevimon', role: 'Treasure Hunter' },
      { name: 'Centarumon', role: 'Guardian of Secret Ancient Ruins' },
      { name: 'Garudamon', role: 'Righteous Digimon' },
    ],
    drops: [
      { monster: 'Centarumon', item: '1-2x Holy Artifacts' },
      { monster: 'Centarumon', item: 'Kentarumon Seal' },
      { monster: 'Centarumon', item: 'DigiEgg (for return)' },
      { monster: 'Leomon (Ancient Site Destroyer)', item: 'Chicken Combo' },
      { monster: 'Leomon (Ancient Site Destroyer)', item: 'DigiEgg (for return)' },
      { monster: 'Dracmon', item: "Pounding Jar's lever" },
    ],
    portals: [],
    bosses: [],
  };

  // Try to link NPC icons
  for (const npc of mapData.npcs) {
    const nameNorm = npc.name.replace(/\s+/g, '_');
    // Try Search_Icon and _Icon patterns
    for (const pattern of [`${nameNorm}_Search_Icon`, `${nameNorm}_Icon`]) {
      const mediaRes = await fetch(
        `${CMS}/api/media?where[filename][contains]=${encodeURIComponent(pattern)}&limit=1`,
        { headers: { Authorization: `JWT ${token}` } },
      );
      const media = await mediaRes.json();
      if (media.docs?.[0]) {
        npc.icon = media.docs[0].id;
        console.log(`  NPC icon: ${npc.name} → ${media.docs[0].filename}`);
        break;
      }
    }
  }

  if (existing.totalDocs > 0) {
    // Update existing
    const patchRes = await fetch(`${CMS}/api/maps/${existing.docs[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: JSON.stringify(mapData),
    });
    console.log('Updated:', patchRes.status);
  } else {
    // Create new
    const createRes = await fetch(`${CMS}/api/maps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: JSON.stringify(mapData),
    });
    const result = await createRes.json();
    console.log('Created:', createRes.status, result.doc?.id || result.errors);
  }
}

main().catch(console.error);
