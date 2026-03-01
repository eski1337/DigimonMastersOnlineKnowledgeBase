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
  const map = await getMap('wind-valley');
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
    { name:'Doggymon', level:'23-27', element:'Pitch Black', attribute:'Data', icon: findDigiIcon('Doggymon') },
    { name:'Wizardmon', level:'23-27', element:'Pitch Black', attribute:'Data', icon: findDigiIcon('Wizardmon') },
    { name:'Icemon', level:'25-29', element:'Ice', attribute:'Data', icon: findDigiIcon('Icemon') },
    { name:'Garurumon', level:'26-30', element:'Ice', attribute:'Vaccine', icon: findDigiIcon('Garurumon') },
    { name:'Gladimon', level:'26-30', element:'Steel', attribute:'Vaccine', icon: findDigiIcon('Gladimon') },
    { name:'Kyubimon', level:'26-28', element:'Fire', attribute:'Data', icon: findDigiIcon('Kyubimon') },
    { name:'SealsDramon', level:'27-31', element:'Steel', attribute:'Virus', icon: findDigiIcon('SealsDramon') },
    { name:'IceDevimon', level:'27-31', element:'Ice', attribute:'Virus', icon: findDigiIcon('IceDevimon') },
    { name:'Leomon', level:'28-30', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Leomon') },
  ];

  const npcs = [
    { name:'Babamon', role:'Granny', icon: findNpcIcon('Babamon') },
    { name:'Jijimon', role:'Grandad', icon: findNpcIcon('Jijimon') },
    { name:'Frigimon', role:'Looking for someone', icon: findNpcIcon('Frigimon') },
    { name:'Pawnchessmon W', role:'DATS Member', icon: findNpcIcon('Pawnchessmon W') },
    { name:'Pawnchessmon B', role:'Warehouse', icon: findNpcIcon('Pawnchessmon B') },
    { name:'Akihiro Kurata', role:'Uncomfortable Doctor', icon: findNpcIcon('Akihiro Kurata') },
    { name:'DigimonArchive', role:'DATS', icon: findNpcIcon('DigimonArchive') },
  ];

  const payload = {
    description: 'A wasteland with strong winds.',
    levelRange: '23-31',
    wildDigimon,
    npcs,
    portals: [
      { destination: 'Wilderness Area', destinationSlug: 'wilderness-area' },
      { destination: 'Ruined Historic', destinationSlug: 'ruined-historic' },
    ],
  };

  const ok = await patchMap(map.id, payload);
  console.log(ok ? '✅ Wind Valley updated!' : '❌ Update failed');
}
main().catch(console.error);
