const http = require('http');
function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}
(async () => {
  // Test CMS directly with depth=1 and limit=1000
  console.log('Fetching 1000 docs with depth=1 from CMS...');
  const r = await fetch('http://localhost:3001/api/digimon?depth=1&limit=1000&where[published][equals]=true');
  
  let populated = 0, stringId = 0, noImage = 0;
  for (const d of r.docs) {
    if (typeof d.mainImage === 'object' && d.mainImage?.url) populated++;
    else if (typeof d.mainImage === 'string') stringId++;
    else noImage++;
  }
  console.log(`Total: ${r.docs.length}`);
  console.log(`Populated: ${populated}, String IDs: ${stringId}, No image: ${noImage}`);
  
  // Check Agumon specifically
  const agumon = r.docs.find(d => d.name === 'Agumon');
  console.log('\nAgumon mainImage type:', typeof agumon?.mainImage);
  if (typeof agumon?.mainImage === 'object') {
    console.log('Agumon mainImage.url:', agumon?.mainImage?.url);
  } else {
    console.log('Agumon mainImage value:', agumon?.mainImage);
  }
  
  // Test with depth=0
  console.log('\n--- depth=0 test ---');
  const r0 = await fetch('http://localhost:3001/api/digimon?depth=0&limit=5&where[mainImage][exists]=true');
  console.log('depth=0 mainImage type:', typeof r0.docs[0]?.mainImage);
  
  // Test with just 5 docs depth=1
  console.log('\n--- depth=1, limit=5 test ---');
  const r5 = await fetch('http://localhost:3001/api/digimon?depth=1&limit=5&where[mainImage][exists]=true');
  console.log('depth=1 limit=5 mainImage type:', typeof r5.docs[0]?.mainImage);
  if (typeof r5.docs[0]?.mainImage === 'object') {
    console.log('url:', r5.docs[0]?.mainImage?.url);
  }
})();
