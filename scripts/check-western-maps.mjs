const CMS = 'http://localhost:3001';
const r = await fetch(`${CMS}/api/maps?where[published][equals]=true&where[area][equals]=western-area&limit=20&depth=1`);
const j = await r.json();
for (const m of j.docs) {
  const hasDigiIcons = m.wildDigimon?.filter(d => d.icon).length || 0;
  const hasNpcIcons = m.npcs?.filter(n => n.icon).length || 0;
  const hasAttr = m.wildDigimon?.filter(d => d.attribute).length || 0;
  const hasElem = m.wildDigimon?.filter(d => d.element).length || 0;
  console.log(`${m.slug} | ${m.name}`);
  console.log(`  npcs: ${m.npcs?.length||0} (icons: ${hasNpcIcons}) | wd: ${m.wildDigimon?.length||0} (icons: ${hasDigiIcons}, attr: ${hasAttr}, elem: ${hasElem})`);
  console.log(`  portals: ${m.portals?.length||0} | img: ${!!m.image} | mapImg: ${!!m.mapImage}`);
  if (m.portals?.length) console.log(`  links: ${m.portals.map(p=>p.destinationSlug||'(none)').join(', ')}`);
}
