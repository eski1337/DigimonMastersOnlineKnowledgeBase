#!/usr/bin/env node
/**
 * Post-deploy one-shot: reset svc password + seed Systems collection.
 * Runs on VPS where MongoDB is at localhost:27017.
 * Self-marks as done via a flag file so it only runs once.
 */
import { createHash } from 'crypto';
import { existsSync, writeFileSync } from 'fs';

const FLAG = '/tmp/.dmokb-systems-seeded';
if (existsSync(FLAG)) {
  console.log('[post-deploy-seed] Already done, skipping.');
  process.exit(0);
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmo-kb';
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const SVC_EMAIL = 'svc@dmokb.info';
const SVC_PASSWORD = 'DmokbSvc2026!Seed';

async function resetPassword() {
  console.log('[1/3] Resetting svc password via MongoDB...');
  // Dynamic import so it only fails on VPS if mongodb isn't installed
  const { MongoClient } = await import('mongodb');
  const bcrypt = await import('bcryptjs');
  
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  
  const hash = await bcrypt.default.hash(SVC_PASSWORD, 10);
  const result = await db.collection('users').updateOne(
    { email: SVC_EMAIL },
    { $set: { hash, _verified: true } }
  );
  console.log(`  Updated ${result.modifiedCount} user(s).`);
  await client.close();
}

async function login() {
  console.log('[2/3] Logging into CMS...');
  const res = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: SVC_EMAIL, password: SVC_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${await res.text()}`);
  const { token } = await res.json();
  console.log('  Login OK.');
  return token;
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

async function seed(token) {
  console.log('[3/3] Seeding 18 system entries...');
  for (const sys of systems) {
    const checkRes = await fetch(`${CMS}/api/systems?where[slug][equals]=${sys.slug}&limit=1`, {
      headers: { Authorization: `JWT ${token}` },
    });
    const checkData = await checkRes.json();
    if (checkData.docs && checkData.docs.length > 0) {
      console.log(`  ✓ "${sys.title}" exists, skip.`);
      continue;
    }
    const res = await fetch(`${CMS}/api/systems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: JSON.stringify({ title: sys.title, slug: sys.slug, summary: sys.summary, published: true, tags: [{ tag: 'System' }] }),
    });
    if (res.ok) console.log(`  ✓ Created "${sys.title}"`);
    else console.error(`  ✗ "${sys.title}": ${await res.text()}`);
  }
}

async function run() {
  try {
    await resetPassword();
    const token = await login();
    await seed(token);
    writeFileSync(FLAG, new Date().toISOString());
    console.log('\nAll done! Flag written to', FLAG);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

run();
