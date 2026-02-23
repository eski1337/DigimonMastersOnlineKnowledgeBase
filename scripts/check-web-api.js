const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
}

(async () => {
  // Check what the WEB API returns (this is what the browser sees)
  const r = await fetch('https://dmokb.info/api/digimon?limit=5');
  const d = JSON.parse(r.body);
  
  console.log('=== WEB API RESPONSE ===');
  for (const doc of d.docs) {
    console.log(`${doc.name}:`);
    console.log(`  mainImage type: ${typeof doc.mainImage}`);
    if (typeof doc.mainImage === 'object' && doc.mainImage) {
      console.log(`  mainImage.url: ${doc.mainImage.url}`);
    } else {
      console.log(`  mainImage value: ${doc.mainImage}`);
    }
    console.log(`  icon type: ${typeof doc.icon}`);
    if (typeof doc.icon === 'object' && doc.icon) {
      console.log(`  icon.url: ${doc.icon.url}`);
    } else {
      console.log(`  icon value: ${doc.icon}`);
    }
  }
  
  // Check next/image optimization for a specific image
  const imgUrl = encodeURIComponent('https://cms.dmokb.info/media/Agumon-1.png');
  const nextImgUrl = `https://dmokb.info/_next/image?url=${imgUrl}&w=384&q=75`;
  const imgRes = await fetch(nextImgUrl);
  console.log(`\n=== NEXT/IMAGE OPTIMIZATION ===`);
  console.log(`URL: ${nextImgUrl}`);
  console.log(`Status: ${imgRes.status}`);
  console.log(`Content-Type: ${imgRes.headers['content-type']}`);
  console.log(`Size: ${imgRes.body.length} bytes`);

  // Check with spaces in filename
  const imgUrl2 = encodeURIComponent('https://cms.dmokb.info/media/WereGarurumon X-1.png');
  const nextImgUrl2 = `https://dmokb.info/_next/image?url=${imgUrl2}&w=384&q=75`;
  const imgRes2 = await fetch(nextImgUrl2);
  console.log(`\nSpaces test (WereGarurumon X):`);
  console.log(`Status: ${imgRes2.status}`);
  console.log(`Content-Type: ${imgRes2.headers['content-type']}`);
})();
