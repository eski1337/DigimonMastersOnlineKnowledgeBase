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
  const map = await getMap('ruined-historic');
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
    { name:'Leomon', level:'30-32', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Leomon') },
    { name:'Panjyamon', level:'31-35', element:'Ice', attribute:'Vaccine', icon: findDigiIcon('Panjyamon') },
    { name:'Aquilamon', level:'32-36', element:'Wind', attribute:'Data', icon: findDigiIcon('Aquilamon') },
    { name:'Garudamon', level:'32-36', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Garudamon') },
    { name:'MetalGreymon', level:'32-36', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('MetalGreymon') },
    { name:'Megadramon', level:'32-36', element:'Steel', attribute:'Virus', icon: findDigiIcon('Megadramon') },
    { name:'Kyubimon', level:'32-34', element:'Fire', attribute:'Data', icon: findDigiIcon('Kyubimon') },
  ];

  const npcs = [
    { name:'MudFrigimon', role:'Roaming Merchant', icon: findNpcIcon('MudFrigimon') },
    { name:'(Head) Leomon', role:'Angry', icon: findNpcIcon('(Head) Leomon') },
    { name:'Ruler SaberLeomon', role:'Ruler of Western Area', icon: findNpcIcon('Ruler SaberLeomon') },
    { name:'SuperStarmon', role:'Fourth Dimension', icon: findNpcIcon('SuperStarmon') },
    { name:'Akihiro Kurata', role:'Suspected as Culprit', icon: findNpcIcon('Akihiro Kurata') },
    { name:'Homer Yushima', role:'DATS Chief', icon: findNpcIcon('Homer Yushima') },
    { name:'Devil Impmon', role:'Bad Boy of Digital World', icon: findNpcIcon('Devil Impmon') },
    { name:'Kamemon', role:'DATS Member', icon: findNpcIcon('Kamemon') },
    { name:'Hawkmon', role:'DATS Member', icon: findNpcIcon('Hawkmon') },
  ];

  const payload = {
    description: 'Traces of experiments were found in the Historic Ruins. DATS Center sent an investigation team.',
    levelRange: '30-36',
    wildDigimon,
    npcs,
    portals: [
      { destination: 'Wind Valley', destinationSlug: 'wind-valley' },
      { destination: 'Digimon Farm', destinationSlug: 'digimon-farm' },
    ],
  };

  const ok = await patchMap(map.id, payload);
  console.log(ok ? '✅ Ruined Historic updated!' : '❌ Update failed');
}
main().catch(console.error);
