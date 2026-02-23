const http = require('http');
const https = require('https');

function fetch(url) {
  const mod = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    mod.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
}

(async () => {
  // Get digimon with images from CMS
  const r = await fetch('http://localhost:3001/api/digimon?depth=1&limit=20&where[mainImage][exists]=true');
  const d = JSON.parse(r.body);
  
  console.log(`Total Digimon with mainImage field: ${d.totalDocs}`);
  console.log(`Checking first ${d.docs.length} image URLs:\n`);
  
  let ok = 0, broken = 0, spacesInUrl = 0;
  
  for (const doc of d.docs) {
    const img = doc.mainImage;
    if (!img || typeof img !== 'object') {
      console.log(`  ${doc.name}: mainImage not populated (${typeof img})`);
      broken++;
      continue;
    }
    
    const url = img.url;
    const filename = img.filename;
    const hasSpace = filename && filename.includes(' ');
    if (hasSpace) spacesInUrl++;
    
    // Check if file exists on disk
    const fs = require('fs');
    const mediaPath = `/home/deploy/app/apps/cms/src/media/${filename}`;
    
    try {
      const imgRes = await fetch(url);
      const isImage = imgRes.headers['content-type']?.startsWith('image/');
      const status = imgRes.status === 200 && isImage ? 'OK' : `FAIL (${imgRes.status}, ${imgRes.headers['content-type']})`;
      
      if (imgRes.status !== 200 || !isImage) {
        console.log(`  ${doc.name}: ${status} | url: ${url} | space: ${hasSpace}`);
        broken++;
      } else {
        ok++;
      }
    } catch (e) {
      console.log(`  ${doc.name}: ERROR ${e.message} | url: ${url}`);
      broken++;
    }
  }
  
  console.log(`\nResults: ${ok} OK, ${broken} broken, ${spacesInUrl} have spaces in filename`);
  
  // Check a specific broken one from screenshot - "Agnimon"
  const r2 = await fetch('http://localhost:3001/api/digimon?depth=1&limit=1&where[name][equals]=Agnimon');
  const d2 = JSON.parse(r2.body);
  if (d2.docs[0]) {
    const doc = d2.docs[0];
    console.log(`\nAgnimon check:`);
    console.log(`  mainImage:`, typeof doc.mainImage, doc.mainImage?.url || doc.mainImage);
    console.log(`  icon:`, typeof doc.icon, doc.icon?.url || doc.icon);
  }
})();
