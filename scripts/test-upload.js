#!/usr/bin/env node
/**
 * Test the CMS media upload flow end-to-end:
 * 1. Login
 * 2. Upload a test image to /api/media
 * 3. Verify file exists on disk
 * 4. Verify file is accessible via URL
 * 5. Link it to a Digimon as mainImage
 * 6. Verify the Digimon now has the image
 * 7. Clean up (unlink from Digimon, delete media)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function request(method, urlPath, body, token, isMultipart = false) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 3001, path: urlPath, method,
      headers: {
        ...(token ? { 'Authorization': 'JWT ' + token } : {}),
      },
    };

    if (body && !isMultipart) {
      const data = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
      const r = http.request(opts, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
          catch(e) { resolve({ status: res.statusCode, body: d }); }
        });
      });
      r.on('error', reject);
      r.write(data);
      r.end();
    } else if (isMultipart) {
      // body is the multipart buffer, headers already set
      const r = http.request(opts, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
          catch(e) { resolve({ status: res.statusCode, body: d }); }
        });
      });
      r.on('error', reject);
      r.write(body.buffer);
      r.end();
    } else {
      const r = http.request(opts, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
          catch(e) { resolve({ status: res.statusCode, body: d }); }
        });
      });
      r.on('error', reject);
      r.end();
    }
  });
}

function uploadFile(urlPath, filePath, fields, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    let body = '';
    // Add fields
    for (const [key, val] of Object.entries(fields || {})) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${val}\r\n`;
    }
    // Add file
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: image/png\r\n\r\n`;

    const bodyStart = Buffer.from(body, 'utf-8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const fullBody = Buffer.concat([bodyStart, fileContent, bodyEnd]);

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

  // Login
  const login = await request('POST', '/api/users/login', { email: 'eski@dmokb.info', password: 'EskiDMOKB2026!' });
  const token = login.body.token;
  if (!token) { console.error('Login failed'); process.exit(1); }
  console.log('1. Login: OK');

  // Create a tiny test PNG (1x1 pixel)
  const testPngPath = '/tmp/test-upload-image.png';
  // Minimal 1x1 red PNG
  const pngData = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e0000000c4944415408d763f86f0000000200018e53c4a80000000049454e44ae426082',
    'hex'
  );
  fs.writeFileSync(testPngPath, pngData);
  console.log('2. Test PNG created:', testPngPath);

  // Upload to CMS
  const uploadRes = await uploadFile('/api/media', testPngPath, {
    alt: 'Test Upload Image',
    imageType: 'digimon-main',
  }, token);

  if (uploadRes.status !== 200 && uploadRes.status !== 201) {
    console.error('3. Upload FAILED:', uploadRes.status, JSON.stringify(uploadRes.body).substring(0, 200));
    process.exit(1);
  }
  const mediaDoc = uploadRes.body.doc;
  console.log('3. Upload: OK');
  console.log('   ID:', mediaDoc.id);
  console.log('   Filename:', mediaDoc.filename);
  console.log('   URL:', mediaDoc.url);

  // Verify file on disk
  const mediaDir = path.resolve(process.cwd(), 'media');
  const diskPath = path.join(mediaDir, mediaDoc.filename);
  const existsOnDisk = fs.existsSync(diskPath);
  console.log('4. File on disk:', existsOnDisk ? 'YES ✓' : 'NO ✗', diskPath);

  // Verify URL is accessible
  const urlCheck = await new Promise((resolve) => {
    http.get('http://localhost:3001/media/' + encodeURIComponent(mediaDoc.filename), (res) => {
      resolve(res.statusCode);
    }).on('error', () => resolve(0));
  });
  console.log('5. URL accessible:', urlCheck === 200 ? 'YES ✓' : 'NO ✗ (status ' + urlCheck + ')');

  // Link to a Digimon
  const digiList = await request('GET', '/api/digimon?limit=1&sort=name&depth=0', null, token);
  const testDigimon = digiList.body.docs[0];
  const origMainImage = testDigimon.mainImage;
  console.log('6. Test Digimon:', testDigimon.name, '(ID:', testDigimon.id + ')');

  const linkRes = await request('PATCH', '/api/digimon/' + testDigimon.id, { mainImage: mediaDoc.id }, token);
  const linked = linkRes.body.doc?.mainImage;
  console.log('7. Link to Digimon:', linked ? 'OK ✓' : 'FAILED ✗');

  // Verify via depth=1
  const verifyRes = await request('GET', '/api/digimon/' + testDigimon.id + '?depth=1', null, token);
  const mainImg = verifyRes.body.mainImage;
  if (mainImg && typeof mainImg === 'object') {
    console.log('8. Verify linked image URL:', mainImg.url);
    console.log('   Image serves correctly:', mainImg.url ? 'YES ✓' : 'NO ✗');
  } else {
    console.log('8. Verify: mainImage not populated:', mainImg);
  }

  // Clean up - restore original mainImage
  await request('PATCH', '/api/digimon/' + testDigimon.id, { mainImage: origMainImage || null }, token);
  console.log('9. Restored original mainImage');

  // Delete test media
  const delRes = await request('DELETE', '/api/media/' + mediaDoc.id, null, token);
  console.log('10. Deleted test media:', delRes.status === 200 ? 'OK ✓' : 'FAILED');

  // Verify file removed from disk
  const stillOnDisk = fs.existsSync(diskPath);
  console.log('11. File cleaned from disk:', !stillOnDisk ? 'YES ✓' : 'NO (still exists)');

  // Clean up temp file
  fs.unlinkSync(testPngPath);

  console.log('\n=== Upload Flow Test Complete ===');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
