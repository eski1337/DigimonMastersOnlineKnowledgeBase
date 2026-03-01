async function main() {
  const CMS = 'http://localhost:3001';

  // Login
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  const { token } = await loginRes.json();
  if (!token) { console.error('Login failed'); process.exit(1); }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `JWT ${token}`,
  };

  // Fetch all existing maps in shinjuku-d-reaper
  const existingRes = await fetch(`${CMS}/api/maps?where[area][equals]=shinjuku-d-reaper&limit=100&depth=0`, { headers });
  const existingData = await existingRes.json();
  const existing = existingData.docs || [];
  console.log('Existing maps:', existing.map(m => `${m.name} (${m.id})`).join(', '));

  // Delete all existing
  for (const m of existing) {
    const r = await fetch(`${CMS}/api/maps/${m.id}`, { method: 'DELETE', headers });
    console.log(`Deleted: ${m.name} - ${r.ok ? 'OK' : 'FAILED'}`);
  }

  // New maps to create
  const newMaps = [
    { name: 'West Shinjuku (D-Reaper)', slug: 'west-shinjuku-d-reaper', mapType: 'field' },
    { name: 'East Shinjuku (D-Reaper)', slug: 'east-shinjuku-d-reaper', mapType: 'field' },
    { name: 'Office', slug: 'office', mapType: 'field' },
    { name: 'Shinjuku Station', slug: 'shinjuku-station-d-reaper', mapType: 'dungeon' },
    { name: 'Shinjuku Park (D-Reaper)', slug: 'shinjuku-park-d-reaper', mapType: 'dungeon' },
    { name: 'Safe Area', slug: 'safe-area-d-reaper', mapType: 'town' },
    { name: 'D-Reaper Area', slug: 'd-reaper-area', mapType: 'dungeon' },
  ];

  for (const m of newMaps) {
    const r = await fetch(`${CMS}/api/maps`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: m.name,
        slug: m.slug,
        world: 'real-world',
        area: 'shinjuku-d-reaper',
        mapType: m.mapType,
        published: true,
      }),
    });
    const d = await r.json();
    console.log(`Created: ${m.name} - ${r.ok ? 'ID: ' + d.doc?.id : 'FAILED: ' + JSON.stringify(d)}`);
  }

  console.log('\nDone! 7 maps in Shinjuku (D-Reaper).');
}

main().catch(e => { console.error(e); process.exit(1); });
