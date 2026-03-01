#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

function req(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3001, path: urlPath, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': 'JWT ' + token } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function uploadFile(urlPath, filePath, fields, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';

    let bodyParts = [];
    for (const [key, val] of Object.entries(fields || {})) {
      bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
    }
    bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    bodyParts.push(fileContent);
    bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const fullBody = Buffer.concat(bodyParts);

    const opts = {
      hostname: 'localhost', port: 3001, path: urlPath, method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
        ...(token ? { 'Authorization': 'JWT ' + token } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    r.write(fullBody);
    r.end();
  });
}

async function main() {
  console.log('=== Test CMS Upload Flow ===\n');

  const login = await req('POST', '/api/users/login', { email: process.env.CMS_ADMIN_EMAIL, password: process.env.CMS_ADMIN_PASSWORD });
  const token = login.body.token;
  console.log('1. Login:', token ? 'OK' : 'FAILED');

  // Use an existing real image file from the media dir
  const mediaDir = '/home/deploy/app/apps/cms/media';
  const files = fs.readdirSync(mediaDir).filter(f => f.endsWith('.png') && f.includes('Icon'));
  const testFile = files[0];
  console.log('2. Using existing image for test:', testFile);

  // Copy to temp with unique name
  const tempPath = '/tmp/test-upload-' + Date.now() + '.png';
  fs.copyFileSync(path.join(mediaDir, testFile), tempPath);

  // Upload
  const uploadRes = await uploadFile('/api/media', tempPath, {
    alt: 'Test Upload Flow',
  }, token);

  if (uploadRes.status !== 200 && uploadRes.status !== 201) {
    console.error('3. Upload FAILED:', uploadRes.status, JSON.stringify(uploadRes.body).substring(0, 300));
    fs.unlinkSync(tempPath);
    process.exit(1);
  }

  const doc = uploadRes.body.doc;
  console.log('3. Upload: OK');
  console.log('   ID:', doc.id);
  console.log('   Filename:', doc.filename);
  console.log('   URL:', doc.url);
  console.log('   Sizes:', Object.keys(doc.sizes || {}).join(', '));

  // Verify on disk
  const onDisk = fs.existsSync(path.join(mediaDir, doc.filename));
  console.log('4. File on disk:', onDisk ? 'YES ✓' : 'NO ✗');

  // Verify thumbnails
  for (const [sizeName, sizeData] of Object.entries(doc.sizes || {})) {
    if (sizeData && sizeData.filename) {
      const thumbOnDisk = fs.existsSync(path.join(mediaDir, sizeData.filename));
      console.log(`   ${sizeName}: ${sizeData.filename} on disk: ${thumbOnDisk ? '✓' : '✗'}`);
    }
  }

  // Verify URL accessible
  const urlStatus = await new Promise((resolve) => {
    http.get('http://localhost:3001/media/' + encodeURIComponent(doc.filename), r => resolve(r.statusCode)).on('error', () => resolve(0));
  });
  console.log('5. URL accessible:', urlStatus === 200 ? 'YES ✓' : 'NO ✗ (' + urlStatus + ')');

  // Link to Digimon
  const digiList = await req('GET', '/api/digimon?limit=1&where[mainImage][exists]=false&depth=0', null, token);
  if (digiList.body.docs && digiList.body.docs.length > 0) {
    const digi = digiList.body.docs[0];
    console.log('6. Linking to:', digi.name);
    const linkRes = await req('PATCH', '/api/digimon/' + digi.id, { mainImage: doc.id }, token);
    console.log('   Link result:', linkRes.body.doc ? 'OK ✓' : 'FAILED');

    // Verify via depth=1
    const verify = await req('GET', '/api/digimon/' + digi.id + '?depth=1', null, token);
    const img = verify.body.mainImage;
    console.log('   Populated URL:', typeof img === 'object' ? img.url : 'NOT POPULATED');

    // Unlink
    await req('PATCH', '/api/digimon/' + digi.id, { mainImage: null }, token);
    console.log('7. Unlinked from Digimon');
  }

  // Delete media
  const delRes = await req('DELETE', '/api/media/' + doc.id, null, token);
  console.log('8. Deleted media:', delRes.status === 200 ? 'OK ✓' : 'FAILED');

  // Verify cleanup
  const stillOnDisk = fs.existsSync(path.join(mediaDir, doc.filename));
  console.log('9. File removed from disk:', !stillOnDisk ? 'YES ✓' : 'NO (still exists)');

  fs.unlinkSync(tempPath);
  console.log('\n=== Upload Flow Test Complete ===');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
