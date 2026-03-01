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
  const map = await getMap('digimon-farm');
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
    { name:'Cerberumon', level:'28-32', element:'Pitch Black', attribute:'Vaccine', icon: findDigiIcon('Cerberumon') },
    { name:'Blossomon', level:'29-33', element:'Wood', attribute:'Data', icon: findDigiIcon('Blossomon') },
    { name:'Leomon', level:'30-32', element:'Fire', attribute:'Vaccine', icon: findDigiIcon('Leomon') },
    { name:'Monzaemon', level:'30-34', element:'Pitch Black', attribute:'Vaccine', icon: findDigiIcon('Monzaemon') },
    { name:'WaruMonzaemon', level:'30-34', element:'Pitch Black', attribute:'Virus', icon: findDigiIcon('WaruMonzaemon') },
    { name:'Gatomon', level:'30-34', element:'Light', attribute:'Vaccine', icon: findDigiIcon('Gatomon') },
    { name:'Kyubimon', level:'32-34', element:'Fire', attribute:'Data', icon: findDigiIcon('Kyubimon') },
  ];

  const npcs = [
    { name:'MudFrigimon', role:'Roaming Merchant', icon: findNpcIcon('MudFrigimon') },
    { name:'MudFrigimon (Young)', role:'Young', icon: findNpcIcon('MudFrigimon (Young)') || findNpcIcon('MudFrigimon') },
    { name:'MudFrigimon (Kind)', role:'Kind', icon: findNpcIcon('MudFrigimon (Kind)') || findNpcIcon('MudFrigimon') },
    { name:'MudFrigimon (Angry)', role:'Angry', icon: findNpcIcon('MudFrigimon (Angry)') || findNpcIcon('MudFrigimon') },
    { name:'Starmon of Passion', role:'Western Station Manager', icon: findNpcIcon('Starmon of Passion') },
    { name:'SuperStarmon', role:'Fourth Dimension', icon: findNpcIcon('SuperStarmon') },
    { name:'Pawnchessmon W', role:'DATS Member', icon: findNpcIcon('Pawnchessmon W') },
    { name:'Akihiro Kurata', role:'Uncomfortable Doctor', icon: findNpcIcon('Akihiro Kurata') },
    { name:'Wanted Deputymon', role:'Wanted Criminal', icon: findNpcIcon('Wanted Deputymon') },
    { name:'DigimonArchive', role:'DATS', icon: findNpcIcon('DigimonArchive') },
  ];

  const payload = {
    description: 'It used to be a peaceful area, now it became chaos due to the rampaging Digimon.',
    levelRange: '26-34',
    wildDigimon,
    npcs,
    portals: [
      { destination: 'Wilderness Area', destinationSlug: 'wilderness-area' },
      { destination: 'Ruined Historic', destinationSlug: 'ruined-historic' },
    ],
  };

  const ok = await patchMap(map.id, payload);
  console.log(ok ? '✅ Digimon Farm updated!' : '❌ Update failed');
}
main().catch(console.error);
