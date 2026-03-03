#!/usr/bin/env node
/**
 * Post-deploy one-shot: seed Systems collection + reset svc password.
 * Uses mongosh CLI (available on VPS) — zero npm dependency issues.
 */
import { existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const FLAG = '/tmp/.dmokb-systems-seeded-v4';
if (existsSync(FLAG)) {
  console.log('[post-deploy-seed] Already done, skipping.');
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

// Build a mongosh script as a string
const now = new Date().toISOString();
let mongoshScript = `use("dmo-kb");\nlet c=0,s=0;\n`;
for (const sys of systems) {
  const t = sys.title.replace(/'/g, "\\'");
  const sl = sys.slug;
  const su = sys.summary.replace(/'/g, "\\'");
  mongoshScript += `if(db.systems.countDocuments({slug:'${sl}'})==0){db.systems.insertOne({title:'${t}',slug:'${sl}',summary:'${su}',published:true,tags:[{tag:'System'}],layout:[],createdAt:'${now}',updatedAt:'${now}'});c++;print('  + ${t}')}else{s++}\n`;
}
mongoshScript += `print('Done: '+c+' created, '+s+' skipped');\n`;

console.log('[post-deploy-seed] Seeding 18 systems via mongosh...');
try {
  execSync(`mongosh --quiet --eval "${mongoshScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
    stdio: 'inherit',
    timeout: 30000,
  });
  writeFileSync(FLAG, now);
  console.log('[post-deploy-seed] Complete.');
} catch (e) {
  // Fallback: try with mongo (older systems)
  console.log('mongosh failed, trying mongo...');
  try {
    execSync(`mongo dmo-kb --quiet --eval "${mongoshScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      stdio: 'inherit',
      timeout: 30000,
    });
    writeFileSync(FLAG, now);
    console.log('[post-deploy-seed] Complete (via mongo).');
  } catch (e2) {
    console.error('[post-deploy-seed] Both mongosh and mongo failed:', e2.message);
    process.exit(1);
  }
}
