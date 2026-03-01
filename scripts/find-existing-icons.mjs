#!/usr/bin/env node
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
let TOKEN = '';

async function login() {
  const r = await fetch(`${CMS}/api/users/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:EMAIL,password:PASSWORD}) });
  TOKEN = (await r.json()).token;
}

async function searchMedia(query) {
  const r = await fetch(`${CMS}/api/media?where[filename][contains]=${encodeURIComponent(query)}&limit=50`, { headers:{Authorization:`JWT ${TOKEN}`} });
  const data = await r.json();
  return (data.docs || []).map(d => ({ id: d.id, filename: d.filename, url: d.url }));
}

async function main() {
  await login();
  
  const searches = [
    'Leomon', 'Impmon', 'SaberLeomon', 'Saberleomon', 'Babamon', 'Jijimon',
    'Icemon', 'Deputymon', 'Greymon', 'Kurata', 'Megumi', 'Miki',
    'Vending', 'Incubator', 'Work_Chief', 'Repairman', 'Guard',
    'Starmon', 'Frigimon'
  ];
  
  for (const q of searches) {
    const results = await searchMedia(q);
    if (results.length > 0) {
      console.log(`\n"${q}" => ${results.length} results:`);
      for (const r of results) console.log(`  ${r.id} | ${r.filename}`);
    } else {
      console.log(`"${q}" => NO results`);
    }
  }
}
main().catch(console.error);
