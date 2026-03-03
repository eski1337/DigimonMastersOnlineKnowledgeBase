#!/usr/bin/env node
/**
 * Post-deploy one-shot: reset svc password (correct pbkdf2 format) + seed Systems.
 * Generates a mongosh-compatible .js file and executes it.
 * Uses ONLY Node.js built-ins (crypto, fs, child_process) — zero npm deps.
 */
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { randomBytes, pbkdf2Sync } from 'crypto';

const FLAG = '/tmp/.dmokb-systems-seeded-v6';
if (existsSync(FLAG)) {
  console.log('[seed] Already done, skipping.');
  process.exit(0);
}

// ── Generate pbkdf2 hash matching passport-local-mongoose defaults ─────
const SVC_PASSWORD = 'DmokbSvc2026!Seed';
const salt = randomBytes(32).toString('hex');
const hash = pbkdf2Sync(SVC_PASSWORD, salt, 25000, 512, 'sha256').toString('hex');

const systems = [
  ['Chat Commands','chat-commands','Overview of all available chat commands in DMO.'],
  ['Currency','currency','All currency types and how to obtain them.'],
  ['Deck System','deck-system','Guide to the Deck system and card bonuses.'],
  ['Digimon Arena','digimon-arena','PvP Arena rules, rankings, and rewards.'],
  ['Digimon Attribute Arena','digimon-attribute-arena','Attribute-based Arena challenges and rewards.'],
  ['Guild','guild','Guild creation, management, and guild-exclusive features.'],
  ['Instance Dungeons','instance-dungeons','All instance dungeons, entry requirements, and loot.'],
  ['Monster Card','monster-card','Monster Card collection, effects, and how to obtain them.'],
  ['Quests','quests','Quest system overview, types, and completion tips.'],
  ['Rare Machine','rare-machine','Rare Machine gacha system and available prizes.'],
  ['Seal Master','seal-master','Seal Master system, seal types, and upgrade paths.'],
  ['Titles','titles','All obtainable titles and their requirements.'],
  ['Digital Draw','digital-draw','Digital Draw lottery system and prize pools.'],
  ['Digital Fusion','digital-fusion','Digital Fusion mechanics and recipes.'],
  ['D-Unit','d-unit','D-Unit system overview and stat bonuses.'],
  ['D-Unit Hacking','d-unit-hacking','D-Unit Hacking process and optimization.'],
  ['D-Unit Fusion','d-unit-fusion','D-Unit Fusion mechanics and success rates.'],
  ['Digimon Breakthrough','digimon-breakthrough','Breakthrough system for Digimon stat upgrades.'],
];

const now = new Date().toISOString();
const TMPFILE = '/tmp/_dmokb_seed.js';

// Build mongosh script
let js = `db = db.getSiblingDB("dmo-kb");
print("[seed] Resetting svc@dmokb.info password (pbkdf2)...");
db.users.updateOne({email:"svc@dmokb.info"},{$set:{hash:"${hash}",salt:"${salt}",_verified:true}});
print("[seed] Seeding systems...");
var c=0, s=0;
`;
for (const [title, slug, summary] of systems) {
  js += `if(db.systems.countDocuments({slug:"${slug}"})===0){db.systems.insertOne({title:"${title}",slug:"${slug}",summary:"${summary}",published:true,tags:[{tag:"System"}],layout:[],createdAt:"${now}",updatedAt:"${now}"});c++;print("  + ${title}")}else{s++}\n`;
}
js += `print("[seed] Done: "+c+" created, "+s+" skipped");\n`;

writeFileSync(TMPFILE, js);
console.log('[seed] Running via mongosh...');

let success = false;
for (const cmd of ['mongosh', 'mongo']) {
  try {
    execSync(`${cmd} --quiet --file ${TMPFILE}`, { stdio: 'inherit', timeout: 30000 });
    success = true;
    break;
  } catch (e) {
    console.log(`[seed] ${cmd} failed: ${e.message}`);
  }
}

try { unlinkSync(TMPFILE); } catch {}

if (success) {
  writeFileSync(FLAG, now);
  console.log('[seed] All done!');
} else {
  console.error('[seed] FAILED — neither mongosh nor mongo available');
  process.exit(1);
}
