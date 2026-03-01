#!/usr/bin/env node
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';

async function main() {
  const res = await fetch(`${CMS}/api/maps?limit=200&depth=0`);
  const data = await res.json();
  console.log(`Total maps in CMS: ${data.totalDocs}\n`);

  const issues = [];
  for (const m of data.docs) {
    const row = [
      m.slug.padEnd(30),
      m.published ? '✅ pub' : '❌ unpub',
      m.image ? '🖼 img' : '⚠ NO img',
      m.mapImage ? '🗺 map' : '⚠ NO map',
      `${(m.wildDigimon?.length || 0)} digi`,
      `${(m.npcs?.length || 0)} npc`,
      `${(m.portals?.length || 0)} portal`,
    ];
    console.log(row.join(' | '));

    // Check for issues
    if (!m.published) issues.push(`${m.name}: not published`);
    if (!m.image && !m.mapImage) issues.push(`${m.name}: no images at all`);
    if ((m.wildDigimon?.length || 0) === 0 && m.mapType !== 'town') issues.push(`${m.name}: field/dungeon with no wild digimon`);

    // Check wild digimon icons
    const missingDigiIcons = (m.wildDigimon || []).filter(d => !d.icon).length;
    if (missingDigiIcons > 0) issues.push(`${m.name}: ${missingDigiIcons} wild digimon missing icons`);

    // Check NPC icons
    const missingNpcIcons = (m.npcs || []).filter(n => !n.icon).length;
    if (missingNpcIcons > 0) issues.push(`${m.name}: ${missingNpcIcons} NPCs missing icons`);
  }

  if (issues.length > 0) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`ISSUES FOUND: ${issues.length}`);
    console.log('═'.repeat(60));
    issues.forEach(i => console.log(`  ⚠ ${i}`));
  } else {
    console.log('\n✅ No issues found!');
  }
}

main().catch(console.error);
