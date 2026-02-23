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
  const r = await fetch('https://dmokb.info/api/digimon?limit=1000');
  let populated = 0, stringId = 0, noImage = 0;
  for (const d of r.docs) {
    if (typeof d.mainImage === 'object' && d.mainImage?.url) populated++;
    else if (typeof d.mainImage === 'string') stringId++;
    else noImage++;
  }
  console.log(`Total: ${r.docs.length}`);
  console.log(`Populated: ${populated}, String IDs: ${stringId}, No image: ${noImage}`);
  
  const agumon = r.docs.find(d => d.name === 'Agumon');
  if (agumon) {
    console.log('\nAgumon mainImage:', typeof agumon.mainImage === 'object' ? agumon.mainImage?.url : agumon.mainImage);
  }
})();
