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
  const map = await getMap('wilderness-area');
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
    { name:'Goblimon', level:'17-21', element:'Pitch Black', attribute:'Virus', icon: findDigiIcon('Goblimon') },
    { name:'Biyomon', level:'17-21', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Biyomon') },
    { name:'Sabirdramon', level:'20-24', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Sabirdramon') },
    { name:'Boarmon', level:'21-26', element:'Land', attribute:'Data', icon: findDigiIcon('Boarmon') },
    { name:'Devimon', level:'22-26', element:'Pitch Black', attribute:'Virus', icon: findDigiIcon('Devimon') },
    { name:'Stingmon', level:'22-26', element:'Pitch Black', attribute:'Virus', icon: findDigiIcon('Stingmon') },
    { name:'Renamon', level:'23-25', element:'Wind', attribute:'Data', icon: findDigiIcon('Renamon') },
  ];

  const npcs = [
    { name:'MudFrigimon', role:'Roaming Merchant', icon: findNpcIcon('MudFrigimon') },
    { name:'Devil Impmon', role:'Bad boy of Digital World', icon: findNpcIcon('Devil Impmon') },
    { name:'Pawnchessmon B', role:'DATS Member', icon: findNpcIcon('Pawnchessmon B') },
    { name:'Akihiro Kurata', role:'Uncomfortable Doctor', icon: findNpcIcon('Akihiro Kurata') },
    { name:'(Head) Leomon', role:'Angry', icon: findNpcIcon('(Head) Leomon') },
    { name:'(Injured) LeomonA', role:'', icon: findNpcIcon('(Injured) LeomonA') },
    { name:'(Injured) LeomonB', role:'', icon: findNpcIcon('(Injured) LeomonB') },
    { name:'(Injured) LeomonC', role:'', icon: findNpcIcon('(Injured) LeomonC') },
    { name:'(Injured) LeomonD', role:'', icon: findNpcIcon('(Injured) LeomonD') },
    { name:'Homer Yushima', role:'Unidentified Old Man', icon: findNpcIcon('Homer Yushima') },
  ];

  const payload = {
    description: 'An area where the rampaging Digimon that have been evicted from the monitored areas now fight each other for control of territory.',
    levelRange: '17-26',
    wildDigimon,
    npcs,
    portals: [
      { destination: 'Western Area: East', destinationSlug: 'western-area-east' },
      { destination: 'Digimon Farm', destinationSlug: 'digimon-farm' },
      { destination: 'Wind Valley', destinationSlug: 'wind-valley' },
    ],
  };

  const ok = await patchMap(map.id, payload);
  console.log(ok ? '✅ Wilderness Area updated!' : '❌ Update failed');
}
main().catch(console.error);
