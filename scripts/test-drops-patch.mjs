// Test if drops field actually works after CMS rebuild
const CMS = 'http://localhost:3001';

async function main() {
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  const { token } = await loginRes.json();

  // Find big-sight
  const res = await fetch(`${CMS}/api/maps?where[slug][equals]=big-sight&limit=1`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const map = (await res.json()).docs?.[0];
  if (!map) { console.log('big-sight not found'); return; }

  console.log('Before patch - drops:', map.drops);

  // Try patching with a test drop
  const testDrops = [{ monster: 'TestMon', item: 'Test Item', quantity: '1x' }];
  const patchRes = await fetch(`${CMS}/api/maps/${map.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ drops: testDrops }),
  });
  
  const patchBody = await patchRes.json();
  console.log('Patch status:', patchRes.status);
  console.log('Patch response drops:', patchBody.doc?.drops);
  console.log('Patch errors:', patchBody.errors);

  // Re-fetch to verify
  const verifyRes = await fetch(`${CMS}/api/maps?where[slug][equals]=big-sight&limit=1`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const verified = (await verifyRes.json()).docs?.[0];
  console.log('After re-fetch - drops:', verified?.drops);

  // Clean up - remove test drop
  await fetch(`${CMS}/api/maps/${map.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ drops: [] }),
  });
  console.log('Cleaned up test drop');
}

main().catch(console.error);
