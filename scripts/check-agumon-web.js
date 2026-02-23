const https = require('https');
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}
(async () => {
  // The browser fetches /api/digimon?limit=1000 then filters client-side
  // Let's check what Agumon looks like in the web API
  const r = await fetch('https://dmokb.info/api/digimon?limit=1000');
  const agumon = r.docs.find(d => d.name === 'Agumon');
  const agnimon = r.docs.find(d => d.name === 'Agnimon');
  const abbadomon = r.docs.find(d => d.name === 'Abbadomon');
  
  console.log('Agumon mainImage:', typeof agumon?.mainImage, JSON.stringify(agumon?.mainImage)?.substring(0, 200));
  console.log('Agumon icon:', typeof agumon?.icon, JSON.stringify(agumon?.icon)?.substring(0, 200));
  console.log('');
  console.log('Agnimon mainImage:', typeof agnimon?.mainImage, JSON.stringify(agnimon?.mainImage)?.substring(0, 200));
  console.log('');
  console.log('Abbadomon mainImage:', typeof abbadomon?.mainImage, JSON.stringify(abbadomon?.mainImage)?.substring(0, 200));
  
  // Count how many have populated images vs string IDs vs undefined
  let populated = 0, stringId = 0, noImage = 0;
  for (const d of r.docs) {
    if (typeof d.mainImage === 'object' && d.mainImage?.url) populated++;
    else if (typeof d.mainImage === 'string') stringId++;
    else noImage++;
  }
  console.log(`\nImage stats: ${populated} populated, ${stringId} string IDs, ${noImage} no image`);
})();
