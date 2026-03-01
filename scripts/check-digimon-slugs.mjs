const CMS='http://localhost:3001';
const names=['Leomon','Panjyamon','Aquilamon','Garudamon','MetalGreymon','Megadramon','Kyubimon','Icemon','Deputymon','Gatomon','Cerberumon','Blossomon','Monzaemon','WaruMonzaemon','Strikedramon'];
for(const n of names){
  const slug=n.toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-').replace(/--+/g,'-').trim();
  const r=await fetch(`${CMS}/api/digimon?where[slug][equals]=${slug}&limit=1&depth=0`);
  const d=(await r.json()).docs?.[0];
  if(d) console.log(`✅ ${n} -> "${slug}" => FOUND (${d.name})`);
  else {
    const r2=await fetch(`${CMS}/api/digimon?where[name][equals]=${encodeURIComponent(n)}&limit=1&depth=0`);
    const d2=(await r2.json()).docs?.[0];
    if(d2) console.log(`❌ ${n} -> "${slug}" NOT FOUND, but exists as slug="${d2.slug}"`);
    else console.log(`❌ ${n} -> "${slug}" NOT FOUND, no CMS entry at all`);
  }
}
