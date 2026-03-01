const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const E = process.env.CMS_ADMIN_EMAIL;
const P = process.env.CMS_ADMIN_PASSWORD;

async function main() {
  const lr = await fetch(`${CMS}/api/users/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E, password: P }),
  });
  const { token } = await lr.json();

  const sr = await fetch(`${CMS}/api/maps?where[slug][equals]=dats-center&limit=1&depth=0`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const sd = await sr.json();
  const doc = sd.docs?.[0];
  if (!doc) { console.log('DATS Center not found'); return; }
  console.log('Found:', doc.id, 'world:', doc.world, 'area:', doc.area);

  if (!doc.world || !doc.area) {
    const ur = await fetch(`${CMS}/api/maps/${doc.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: JSON.stringify({ world: 'real-world', area: 'dats-center', mapType: 'town', sortOrder: 0, published: true }),
    });
    console.log(ur.ok ? 'Updated successfully' : 'Update failed: ' + ur.status);
  } else {
    console.log('Already has world/area set');
  }
}
main().catch(console.error);
