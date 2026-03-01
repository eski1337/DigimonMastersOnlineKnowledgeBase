// Check NPC icon status in the CMS
const CMS = 'http://localhost:3001';

async function main() {
  // Check a map with NPCs
  const res = await fetch(`${CMS}/api/maps?where[slug][equals]=dats-center&depth=1&limit=1`);
  const map = (await res.json()).docs?.[0];
  if (!map) { console.log('Map not found'); return; }

  console.log('=== NPC icon status for', map.name, '===');
  for (const npc of (map.npcs || []).slice(0, 10)) {
    console.log(`  ${npc.name}: icon=${JSON.stringify(npc.icon)?.slice(0, 120)}`);
  }

  // Check what NPC icon media exists
  console.log('\n=== NPC-related media ===');
  const mediaRes = await fetch(`${CMS}/api/media?where[filename][contains]=Icon&limit=30&sort=filename`);
  const media = await mediaRes.json();
  console.log(`Total matching: ${media.totalDocs}`);
  for (const m of (media.docs || []).slice(0, 15)) {
    console.log(`  ${m.filename} → ${m.url}`);
  }

  // Check search-icon media
  console.log('\n=== Search_Icon media ===');
  const searchRes = await fetch(`${CMS}/api/media?where[filename][contains]=Search_Icon&limit=30&sort=filename`);
  const searchMedia = await searchRes.json();
  console.log(`Total matching: ${searchMedia.totalDocs}`);
  for (const m of (searchMedia.docs || []).slice(0, 15)) {
    console.log(`  ${m.filename} → ${m.url}`);
  }
}

main().catch(console.error);
