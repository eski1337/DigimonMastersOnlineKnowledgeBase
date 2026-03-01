const CMS = 'http://localhost:3001';
const r = await fetch(`${CMS}/api/maps?limit=200&depth=0`);
const d = await r.json();
const slugs = d.docs.map(m => m.slug).sort();
for (const s of slugs) console.log(s);
console.log(`\nTotal: ${slugs.length} maps`);
