#!/usr/bin/env node
const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3001, path, method,
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

async function main() {
  const login = await req('POST', '/api/users/login', { email: process.env.CMS_ADMIN_EMAIL, password: process.env.CMS_ADMIN_PASSWORD });
  const token = login.body.token;

  // Check first 5 Digimon with depth=1 to get populated media
  const res = await req('GET', '/api/digimon?limit=5&sort=name&depth=1', null, token);
  for (const doc of res.body.docs || []) {
    const icon = doc.icon;
    const main = doc.mainImage;
    console.log(`${doc.name}:`);
    if (icon && typeof icon === 'object') {
      console.log(`  icon: ${icon.url} (${icon.filename})`);
    } else {
      console.log(`  icon: ${icon || 'NONE'}`);
    }
    if (main && typeof main === 'object') {
      console.log(`  main: ${main.url} (${main.filename})`);
    } else {
      console.log(`  main: ${main || 'NONE'}`);
    }
  }

  // Check what the web API returns (depth=0 vs depth=1)
  console.log('\n--- Web API (depth=0) ---');
  const res0 = await req('GET', '/api/digimon?limit=3&sort=name&depth=0', null, token);
  for (const doc of res0.body.docs || []) {
    console.log(`${doc.name}: icon=${doc.icon || 'NONE'} main=${doc.mainImage || 'NONE'}`);
  }

  // Check a media file directly
  console.log('\n--- Sample media file ---');
  const media = await req('GET', '/api/media?limit=1&where[belongsTo.digimon][exists]=true', null, token);
  if (media.body.docs && media.body.docs.length > 0) {
    const m = media.body.docs[0];
    console.log(`filename: ${m.filename}`);
    console.log(`url: ${m.url}`);
    console.log(`mimeType: ${m.mimeType}`);
    console.log(`belongsTo: ${JSON.stringify(m.belongsTo)}`);
    
    // Test if the URL is accessible
    const testUrl = m.url;
    console.log(`\nTesting access to: ${testUrl}`);
    const testRes = await req('GET', testUrl, null, null);
    console.log(`Status: ${testRes.status}`);
  }

  // Check what the web frontend API route returns
  console.log('\n--- Web frontend /api/digimon ---');
  const webReq = http.get('http://localhost:3000/api/digimon?limit=2', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try {
        const data = JSON.parse(d);
        for (const doc of data.docs || []) {
          const icon = doc.icon;
          const main = doc.mainImage;
          console.log(`${doc.name}:`);
          if (icon && typeof icon === 'object') {
            console.log(`  icon url: ${icon.url}`);
          } else {
            console.log(`  icon: ${icon || 'NONE'}`);
          }
          if (main && typeof main === 'object') {
            console.log(`  main url: ${main.url}`);
          } else {
            console.log(`  main: ${main || 'NONE'}`);
          }
        }
      } catch(e) {
        console.log('Error:', e.message, d.substring(0, 200));
      }
    });
  });
}

main().catch(e => console.error(e));
