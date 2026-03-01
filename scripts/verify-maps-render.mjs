// Checks that map pages render icons properly
const maps = ['western-village','digimon-farm','western-area-outskirts','western-area-east','wilderness-area','wind-valley','ruined-historic'];
for (const slug of maps) {
  const r = await fetch(`http://localhost:3000/maps/${slug}`);
  const html = await r.text();
  const npcIcons = (html.match(/cms\.dmokb\.info\/media\//g) || []).length;
  const elemIcons = (html.match(/\/icons\/Elements\//g) || []).length;
  const attrIcons = (html.match(/\/icons\/Attributes\//g) || []).length;
  const portalLinks = (html.match(/\/maps\/[a-z-]+/g) || []).filter(l => l !== `/maps/${slug}`);
  const uniquePortals = [...new Set(portalLinks)];
  console.log(`${slug}`);
  console.log(`  CMS images: ${npcIcons} | Elem icons: ${elemIcons} | Attr icons: ${attrIcons} | Portal links: ${uniquePortals.length} (${uniquePortals.join(', ')})`);
  if (r.status !== 200) console.log(`  ⚠️ Status: ${r.status}`);
}
