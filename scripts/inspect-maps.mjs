// Quick inspection of CMS map data
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';

async function main() {
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  const { token } = await loginRes.json();

  // Check drops + fields on specific maps
  for (const slug of ['big-sight', 'file-island-waterfront', 'shibuya']) {
    const res = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&depth=0&limit=1`, {
      headers: { Authorization: `JWT ${token}` },
    });
    const m = (await res.json()).docs?.[0];
    console.log(`\n=== ${slug} ===`);
    console.log('keys:', Object.keys(m || {}).join(', '));
    console.log('wild:', m?.wildDigimon?.length, 'npcs:', m?.npcs?.length, 'drops:', m?.drops?.length);
    if (m?.drops?.length > 0) console.log('  first drop:', JSON.stringify(m.drops[0]));
    if (m?.wildDigimon?.length > 0) console.log('  first wild:', JSON.stringify(m.wildDigimon[0]));
  }
}

main().catch(console.error);
