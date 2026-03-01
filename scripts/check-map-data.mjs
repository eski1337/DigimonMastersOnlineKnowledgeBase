const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const slug = process.argv[2] || 'yokohama-village';
const res = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&depth=1&limit=1`);
const data = await res.json();
const m = data.docs?.[0];
if (!m) { console.log('Not found'); process.exit(1); }
console.log(JSON.stringify({ portals: m.portals, wildDigimon: m.wildDigimon?.slice(0,2) }, null, 2));
