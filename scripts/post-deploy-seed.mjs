#!/usr/bin/env node
/**
 * Post-deploy one-shot: seed Systems collection.
 * Writes a temp .js file and runs it via mongosh (file-based, no escaping issues).
 * Falls back to Node.js + mongodb driver if mongosh is unavailable.
 */
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

const FLAG = '/tmp/.dmokb-systems-seeded-v5';
if (existsSync(FLAG)) {
  console.log('[post-deploy-seed] Already seeded, skipping.');
  process.exit(0);
}

const systems = [
  { title: 'Chat Commands', slug: 'chat-commands', summary: 'Overview of all available chat commands in DMO.' },
  { title: 'Currency', slug: 'currency', summary: 'All currency types and how to obtain them.' },
  { title: 'Deck System', slug: 'deck-system', summary: 'Guide to the Deck system and card bonuses.' },
  { title: 'Digimon Arena', slug: 'digimon-arena', summary: 'PvP Arena rules, rankings, and rewards.' },
  { title: 'Digimon Attribute Arena', slug: 'digimon-attribute-arena', summary: 'Attribute-based Arena challenges and rewards.' },
  { title: 'Guild', slug: 'guild', summary: 'Guild creation, management, and guild-exclusive features.' },
  { title: 'Instance Dungeons', slug: 'instance-dungeons', summary: 'All instance dungeons, entry requirements, and loot.' },
  { title: 'Monster Card', slug: 'monster-card', summary: 'Monster Card collection, effects, and how to obtain them.' },
  { title: 'Quests', slug: 'quests', summary: 'Quest system overview, types, and completion tips.' },
  { title: 'Rare Machine', slug: 'rare-machine', summary: 'Rare Machine gacha system and available prizes.' },
  { title: 'Seal Master', slug: 'seal-master', summary: 'Seal Master system, seal types, and upgrade paths.' },
  { title: 'Titles', slug: 'titles', summary: 'All obtainable titles and their requirements.' },
  { title: 'Digital Draw', slug: 'digital-draw', summary: 'Digital Draw lottery system and prize pools.' },
  { title: 'Digital Fusion', slug: 'digital-fusion', summary: 'Digital Fusion mechanics and recipes.' },
  { title: 'D-Unit', slug: 'd-unit', summary: 'D-Unit system overview and stat bonuses.' },
  { title: 'D-Unit Hacking', slug: 'd-unit-hacking', summary: 'D-Unit Hacking process and optimization.' },
  { title: 'D-Unit Fusion', slug: 'd-unit-fusion', summary: 'D-Unit Fusion mechanics and success rates.' },
  { title: 'Digimon Breakthrough', slug: 'digimon-breakthrough', summary: 'Breakthrough system for Digimon stat upgrades.' },
];

const now = new Date().toISOString();
const TMPFILE = '/tmp/_seed_systems.js';

// ── Approach 1: mongosh with a file ────────────────────────────────────
function tryMongosh() {
  let script = 'db = db.getSiblingDB("dmo-kb");\nvar c=0, s=0;\n';
  for (const sys of systems) {
    script += `if (db.systems.countDocuments({slug:"${sys.slug}"}) === 0) { db.systems.insertOne({title:"${sys.title}",slug:"${sys.slug}",summary:"${sys.summary}",published:true,tags:[{tag:"System"}],layout:[],createdAt:"${now}",updatedAt:"${now}"}); c++; print("  + ${sys.title}"); } else { s++; }\n`;
  }
  script += 'print("Done: " + c + " created, " + s + " skipped");\n';
  writeFileSync(TMPFILE, script);
  try {
    execSync(`mongosh --quiet --file ${TMPFILE}`, { stdio: 'inherit', timeout: 30000 });
    return true;
  } catch {
    try {
      execSync(`mongo --quiet ${TMPFILE}`, { stdio: 'inherit', timeout: 30000 });
      return true;
    } catch { return false; }
  } finally {
    try { unlinkSync(TMPFILE); } catch {}
  }
}

// ── Approach 2: Node.js + mongodb driver ───────────────────────────────
async function tryNodeDriver() {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient('mongodb://localhost:27017/dmo-kb');
  await client.connect();
  const col = client.db().collection('systems');
  let c = 0, s = 0;
  for (const sys of systems) {
    if (await col.countDocuments({ slug: sys.slug }) > 0) { s++; continue; }
    await col.insertOne({
      title: sys.title, slug: sys.slug, summary: sys.summary,
      published: true, tags: [{ tag: 'System' }], layout: [],
      createdAt: now, updatedAt: now,
    });
    c++;
    console.log(`  + ${sys.title}`);
  }
  console.log(`Done: ${c} created, ${s} skipped`);
  await client.close();
}

// ── Run ────────────────────────────────────────────────────────────────
console.log('[post-deploy-seed] Seeding 18 systems...');
let ok = tryMongosh();
if (!ok) {
  console.log('[post-deploy-seed] mongosh unavailable, trying Node.js mongodb driver...');
  try {
    await tryNodeDriver();
    ok = true;
  } catch (e) {
    console.error('[post-deploy-seed] Node driver failed:', e.message);
  }
}
if (ok) {
  writeFileSync(FLAG, now);
  console.log('[post-deploy-seed] Complete!');
} else {
  console.error('[post-deploy-seed] All approaches failed.');
  process.exit(1);
}
