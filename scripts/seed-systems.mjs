/**
 * Seed script to create skeleton System entries in the CMS.
 * Usage: node scripts/seed-systems.mjs
 *
 * Requires CMS to be running. Set CMS_URL env var if not default.
 */

const CMS_URL = process.env.CMS_URL || 'https://cms.dmokb.info';
const EMAIL = process.env.CMS_EMAIL;
const PASSWORD = process.env.CMS_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Set CMS_EMAIL and CMS_PASSWORD env vars');
  process.exit(1);
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

async function run() {
  // Login
  console.log('Logging in...');
  const loginRes = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    process.exit(1);
  }
  const { token } = await loginRes.json();
  console.log('Logged in successfully.');

  for (const sys of systems) {
    // Check if already exists
    const checkRes = await fetch(`${CMS_URL}/api/systems?where[slug][equals]=${sys.slug}&limit=1`, {
      headers: { Authorization: `JWT ${token}` },
    });
    const checkData = await checkRes.json();
    if (checkData.docs && checkData.docs.length > 0) {
      console.log(`  ✓ "${sys.title}" already exists, skipping.`);
      continue;
    }

    const res = await fetch(`${CMS_URL}/api/systems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({
        title: sys.title,
        slug: sys.slug,
        summary: sys.summary,
        published: true,
        tags: [{ tag: 'System' }],
      }),
    });
    if (res.ok) {
      console.log(`  ✓ Created "${sys.title}"`);
    } else {
      console.error(`  ✗ Failed to create "${sys.title}":`, await res.text());
    }
  }

  console.log('Done!');
}

run().catch(console.error);
