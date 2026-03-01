async function main() {
  const CMS = 'http://localhost:3001';
  const r = await fetch(`${CMS}/api/maps?where[area][equals]=shinjuku-d-reaper&depth=1&limit=20`);
  const d = await r.json();
  for (const m of d.docs) {
    console.log(m.name, '->', m.image ? m.image.url : 'NO IMAGE');
  }
}
main().catch(console.error);
