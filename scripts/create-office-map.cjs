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

  // Create the map
  const res = await fetch(`${CMS}/api/maps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `JWT ${token}`,
    },
    body: JSON.stringify({
      name: 'Office',
      slug: 'office',
      world: 'real-world',
      area: 'shinjuku-d-reaper',
      mapType: 'dungeon',
      published: true,
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log('Created map:', data.doc?.name, '- ID:', data.doc?.id);
  } else {
    console.error('Failed:', res.status, JSON.stringify(data));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
