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
  const map = await getMap('western-area-east');
  if (!map) { console.error('Map not found!'); return; }
  console.log(`Found: ${map.name} (id=${map.id})`);

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
    { name:'Strikedramon', level:'26-28', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Strikedramon') },
    { name:'Patamon', level:'15-19', element:'Wind', attribute:'Vaccine', icon: findDigiIcon('Patamon') },
    { name:'Leomon', level:'15-19', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Leomon') },
    { name:'Greymon', level:'20-24', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Greymon') },
    { name:'Deputymon', level:'16-20', element:'Steel', attribute:'Vaccine', icon: findDigiIcon('Deputymon') },
    { name:'Rockmon', level:'18-22', element:'Land', attribute:'Virus', icon: findDigiIcon('Rockmon') },
    { name:'Dobermon', level:'15-19', element:'Pitch Black', attribute:'Virus', icon: findDigiIcon('Dobermon') },
    { name:'Renamon', level:'18-20', element:'Wind', attribute:'Data', icon: findDigiIcon('Renamon') },
  ];

  const npcs = [
    { name:'MudFrigimon', role:'Roaming Merchant', icon: findNpcIcon('MudFrigimon') },
    { name:'Starmon of Passion', role:'Western Station Manager', icon: findNpcIcon('Starmon of Passion') },
    { name:'Greymon of Justice', role:'', icon: findNpcIcon('Greymon of Justice') },
    { name:'Pawnchessmon W', role:'DATS Member', icon: findNpcIcon('Pawnchessmon W') },
    { name:'Akihiro Kurata', role:'Uncomfortable Doctor', icon: findNpcIcon('Akihiro Kurata') },
    { name:'Devil Impmon', role:'Bad boy of Digital World', icon: findNpcIcon('Devil Impmon') },
    { name:'Wanted Deputymon', role:'Wanted Criminal', icon: findNpcIcon('Wanted Deputymon') },
  ];

  const payload = {
    description: 'The passage between the Western Village and the Digimon Farm. Its security is severely threatened by the rampaging Digimon.',
    levelRange: '15-28',
    wildDigimon,
    npcs,
    portals: [
      { destination: 'Western Area: Outskirts', destinationSlug: 'western-area-outskirts' },
      { destination: 'Wilderness Area', destinationSlug: 'wilderness-area' },
    ],
  };

  const ok = await patchMap(map.id, payload);
  console.log(ok ? '✅ Western Area: East updated!' : '❌ Update failed');
}
main().catch(console.error);
