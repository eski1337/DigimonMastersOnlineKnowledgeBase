const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
// Look up a few digimon by name to see what fields/images are available
const names = ['Kyubimon', 'Agumon', 'Meramon'];
for (const name of names) {
  const res = await fetch(`${CMS}/api/digimon?where[name][equals]=${encodeURIComponent(name)}&limit=1&depth=0`);
  const data = await res.json();
  const d = data.docs?.[0];
  if (d) {
    console.log(`${name}: id=${d.id}, mainImage=${d.mainImage}, slug=${d.slug}`);
  } else {
    console.log(`${name}: NOT FOUND`);
  }
}
