const CMS = 'http://localhost:3001';
const r = await fetch(`${CMS}/api/maps?where[slug][equals]=wilderness-area&limit=1&depth=0`);
const j = await r.json();
const m = j.docs?.[0];
if (m) {
  console.log('portals:', JSON.stringify(m.portals));
  console.log('published:', m.published);
} else {
  console.log('NOT FOUND');
}
