async function main() {
  const CMS = 'http://localhost:3001';
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  const { token } = await loginRes.json();

  const res = await fetch(`${CMS}/api/maps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `JWT ${token}` },
    body: JSON.stringify({
      name: 'Shinjuku Park',
      slug: 'shinjuku-park',
      world: 'real-world',
      area: 'shinjuku-d-reaper',
      mapType: 'field',
      published: true,
    }),
  });
  const data = await res.json();
  console.log(res.ok ? `Created: Shinjuku Park - ID: ${data.doc?.id}` : `Failed: ${JSON.stringify(data)}`);
}
main().catch(e => { console.error(e); process.exit(1); });
