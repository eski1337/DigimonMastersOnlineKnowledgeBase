#!/usr/bin/env node
/**
 * Post-deploy one-shot: seed Systems collection + reset svc password.
 * Writes directly to MongoDB — no CMS API login needed.
 * Runs on VPS where MongoDB is at localhost:27017.
 */
import { existsSync, writeFileSync } from 'fs';

const FLAG = '/tmp/.dmokb-systems-seeded-v3';
if (existsSync(FLAG)) {
  console.log('[post-deploy-seed] Already done, skipping.');
  process.exit(0);
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmo-kb';

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

async function run() {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  const col = db.collection('systems');

  // 1. Reset svc password
  console.log('[1/2] Resetting svc@dmokb.info password...');
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.default.hash('DmokbSvc2026!Seed', 10);
  const pwResult = await db.collection('users').updateOne(
    { email: 'svc@dmokb.info' },
    { $set: { hash, _verified: true } }
  );
  console.log(`  Updated ${pwResult.modifiedCount} user(s).`);

  // 2. Seed systems directly into MongoDB
  console.log('[2/2] Seeding systems into MongoDB...');
  let created = 0, skipped = 0;
  const now = new Date().toISOString();
  for (const sys of systems) {
    const exists = await col.findOne({ slug: sys.slug });
    if (exists) { skipped++; continue; }
    await col.insertOne({
      title: sys.title,
      slug: sys.slug,
      summary: sys.summary,
      published: true,
      tags: [{ tag: 'System' }],
      layout: [],
      createdAt: now,
      updatedAt: now,
    });
    created++;
    console.log(`  ✓ ${sys.title}`);
  }
  console.log(`\nDone: ${created} created, ${skipped} already existed.`);

  await client.close();
  writeFileSync(FLAG, now);
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
