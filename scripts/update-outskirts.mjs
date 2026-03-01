#!/usr/bin/env node
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
let TOKEN = '';

async function login() {
  const r = await fetch(`${CMS}/api/users/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:EMAIL,password:PASSWORD}) });
  TOKEN = (await r.json()).token; console.log('Logged in');
}
async function getMap(slug) {
  const r = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&limit=1&depth=2`, { headers:{Authorization:`JWT ${TOKEN}`} });
  return (await r.json()).docs?.[0] || null;
}
async function patchMap(id, payload) {
  const r = await fetch(`${CMS}/api/maps/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json',Authorization:`JWT ${TOKEN}`}, body:JSON.stringify(payload) });
  if (!r.ok) { const t = await r.text(); console.error(`Fail: ${t.slice(0,300)}`); return false; }
  return true;
}

async function main() {
  await login();
  const map = await getMap('western-area-outskirts');
  if (!map) { console.error('Map not found!'); return; }
  console.log(`Found: ${map.name} (id=${map.id})`);

  // Preserve existing icon IDs from current data
  const existingDigimon = map.wildDigimon || [];
  const existingNpcs = map.npcs || [];

  function findDigiIcon(name) {
    const d = existingDigimon.find(d => d.name === name);
    return d?.icon?.id || d?.icon || null;
  }
  function findNpcIcon(name) {
    const n = existingNpcs.find(n => n.name === name);
    return n?.icon?.id || n?.icon || null;
  }

  const wildDigimon = [
    { name:'Kiwimon', level:'13-17', element:'Land', attribute:'Data', icon: findDigiIcon('Kiwimon') },
    { name:'RedVegiemon', level:'14-18', element:'Wood', attribute:'Virus', icon: findDigiIcon('RedVegiemon') },
    { name:'Birdramon', level:'14-18', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Birdramon') },
    { name:'Flymon', level:'14-18', element:'Wind', attribute:'Virus', icon: findDigiIcon('Flymon') },
    { name:'Leomon', level:'15-19', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Leomon') },
    { name:'Dokugumon', level:'15-19', element:'Pitch Black', attribute:'Virus', icon: findDigiIcon('Dokugumon') },
    { name:'Renamon', level:'16-18', element:'Wind', attribute:'Data', icon: findDigiIcon('Renamon') },
    { name:'Strikedramon', level:'26-28', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Strikedramon') },
  ];

  const npcs = [
    { name:'MudFrigimon', role:'Roaming Merchant', icon: findNpcIcon('MudFrigimon') },
    { name:'Starmon of Passion', role:'Western Station Manager', icon: findNpcIcon('Starmon of Passion') },
    { name:'(Head) Leomon', role:'', icon: findNpcIcon('(Head) Leomon') },
    { name:'Pawnchessmon W', role:'DATS Member', icon: findNpcIcon('Pawnchessmon W') },
    { name:'Akihiro Kurata', role:'Uncomfortable Doctor', icon: findNpcIcon('Akihiro Kurata') },
    { name:'Devil Impmon', role:'Bad boy of Digital World', icon: findNpcIcon('Devil Impmon') },
  ];

  const payload = {
    description: 'An border area of Western Village, the Outskirts.',
    levelRange: '13-28',
    wildDigimon,
    npcs,
    portals: [
      { destination: 'Western Village', destinationSlug: 'western-village' },
      { destination: 'Western Area: East', destinationSlug: 'western-area-east' },
    ],
  };

  const ok = await patchMap(map.id, payload);
  console.log(ok ? '✅ Western Area: Outskirts updated!' : '❌ Update failed');
}
main().catch(console.error);
