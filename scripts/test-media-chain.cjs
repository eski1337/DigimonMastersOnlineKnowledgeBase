async function main() {
  const CMS = 'http://localhost:3001';

  // Login
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  const { token } = await loginRes.json();

  // 1. Check a recent media doc
  const mediaRes = await fetch(`${CMS}/api/media?limit=3&depth=0&sort=-createdAt`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const mediaData = await mediaRes.json();
  console.log('=== Recent media docs ===');
  for (const doc of mediaData.docs) {
    console.log(`  ${doc.filename} → url: ${doc.url}`);
    console.log(`    sizes: ${Object.keys(doc.sizes || {}).join(', ') || 'none'}`);
    if (doc.sizes?.thumbnail) {
      console.log(`    thumbnail url: ${doc.sizes.thumbnail.url}`);
    }
  }

  // 2. Check a map with populated image
  const mapRes = await fetch(`${CMS}/api/maps?where[published][equals]=true&depth=1&limit=3`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const mapData = await mapRes.json();
  console.log('\n=== Maps with images ===');
  for (const map of mapData.docs) {
    const img = map.image;
    if (img) {
      console.log(`  ${map.name}: image.url = ${img.url || 'MISSING'}`);
      console.log(`    image.filename = ${img.filename || 'MISSING'}`);
      console.log(`    thumbnail = ${img.sizes?.thumbnail?.url || 'none'}`);
    } else {
      console.log(`  ${map.name}: no image`);
    }
  }

  // 3. Test that image URLs are actually accessible
  console.log('\n=== URL accessibility ===');
  if (mediaData.docs[0]) {
    const doc = mediaData.docs[0];
    const urls = [
      { label: 'relative url', url: doc.url },
      { label: 'absolute url', url: `https://cms.dmokb.info${doc.url}` },
      { label: 'localhost url', url: `http://localhost:3001${doc.url}` },
    ];
    for (const u of urls) {
      try {
        const r = await fetch(u.url, { redirect: 'follow' });
        console.log(`  ${u.label}: ${r.status} (${r.headers.get('content-type') || 'unknown'})`);
      } catch (e) {
        console.log(`  ${u.label}: FAILED - ${e.message}`);
      }
    }
  }

  // 4. Test upload
  console.log('\n=== Test upload ===');
  const testBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const FormData = (await import('node:buffer')).File
    ? null  // Node 20 has File but not FormData for fetch
    : null;
  
  // Use multipart boundary manually
  const boundary = '----TestBoundary' + Date.now();
  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-upload-check.png"\r\nContent-Type: image/png\r\n\r\n`,
    testBuffer,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="alt"\r\n\r\ntest upload check\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="imageType"\r\n\r\nother\r\n`,
    `--${boundary}--\r\n`,
  ];
  
  const body = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : p));
  
  const uploadRes = await fetch(`${CMS}/api/media`, {
    method: 'POST',
    headers: {
      Authorization: `JWT ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  const uploadData = await uploadRes.json();
  if (uploadRes.ok) {
    console.log(`  Upload SUCCESS: id=${uploadData.doc.id}, url=${uploadData.doc.url}`);
    console.log(`  filename: ${uploadData.doc.filename}`);
    console.log(`  sizes: ${JSON.stringify(Object.keys(uploadData.doc.sizes || {}))}`);
    
    // Verify file is accessible
    const checkUrl = `http://localhost:3001${uploadData.doc.url}`;
    const checkRes = await fetch(checkUrl);
    console.log(`  File accessible: ${checkRes.status} (${checkRes.headers.get('content-type')})`);
    
    // Clean up test file
    await fetch(`${CMS}/api/media/${uploadData.doc.id}`, {
      method: 'DELETE',
      headers: { Authorization: `JWT ${token}` },
    });
    console.log('  Test file cleaned up');
  } else {
    console.log(`  Upload FAILED: ${uploadRes.status}`, JSON.stringify(uploadData).substring(0, 200));
  }

  // 5. Check disk permissions
  console.log('\n=== Disk check ===');
  const fs = require('fs');
  const mediaDir = '/home/deploy/app/apps/cms/media';
  try {
    fs.accessSync(mediaDir, fs.constants.W_OK);
    console.log('  Media dir writeable: YES');
  } catch {
    console.log('  Media dir writeable: NO');
  }
  const files = fs.readdirSync(mediaDir);
  console.log(`  Total files: ${files.length}`);
  console.log(`  Recent files:`);
  const stats = files.slice(-5).map(f => {
    const s = fs.statSync(`${mediaDir}/${f}`);
    return `    ${f} (${s.size} bytes, ${s.mtime.toISOString()})`;
  });
  stats.forEach(s => console.log(s));
}

main().catch(e => { console.error(e); process.exit(1); });
