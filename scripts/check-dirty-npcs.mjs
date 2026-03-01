// Find all NPCs with HTML entities or tags still in name/role
const CMS = 'http://localhost:3001';

async function main() {
  let page = 1;
  const dirty = [];
  while (true) {
    const res = await fetch(`${CMS}/api/maps?limit=50&page=${page}&depth=0`);
    const data = await res.json();
    if ((data.docs || []).length === 0) break;
    for (const map of data.docs) {
      for (const npc of (map.npcs || [])) {
        const hasHtmlName = /(<[^>]+>|&#\d+;|&amp;|&lt;|&gt;|&quot;)/.test(npc.name || '');
        const hasHtmlRole = /(<[^>]+>|&#\d+;|&amp;|&lt;|&gt;|&quot;)/.test(npc.role || '');
        if (hasHtmlName || hasHtmlRole) {
          dirty.push({ map: map.slug, name: npc.name, role: npc.role });
        }
      }
    }
    if (!data.hasNextPage) break;
    page++;
  }
  console.log(`Found ${dirty.length} dirty NPC entries:`);
  dirty.forEach(d => console.log(`  [${d.map}] name="${d.name}" role="${d.role}"`));
}

main().catch(console.error);
