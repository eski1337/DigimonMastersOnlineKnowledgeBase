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
  // Login
  const login = await req('POST', '/api/users/login', { email: 'eski@dmokb.info', password: 'EskiDMOKB2026!' });
  const token = login.body.token;
  console.log('Login:', token ? 'OK' : 'FAILED');

  // Get first Digimon
  const list = await req('GET', '/api/digimon?limit=1&sort=name&depth=0', null, token);
  const doc = list.body.docs[0];
  console.log(`\nDigimon: ${doc.name} (ID: ${doc.id})`);
  console.log(`Admin URL: https://cms.dmokb.info/admin/collections/digimon/${doc.id}`);
  const origIntro = doc.introduction || '';

  // Edit via CMS API
  const testIntro = 'TEST EDIT: ' + new Date().toISOString();
  const patch = await req('PATCH', `/api/digimon/${doc.id}`, { introduction: testIntro }, token);
  console.log(`\nPATCH: ${patch.body.doc ? 'OK' : 'FAILED'}`);
  if (patch.body.doc) {
    console.log(`  New intro: ${patch.body.doc.introduction.substring(0, 60)}`);
  }

  // Check via findByID
  const check = await req('GET', `/api/digimon/${doc.id}?depth=0`, null, token);
  console.log(`findByID: ${check.body.name ? 'OK' : 'FAILED'} - intro: ${(check.body.introduction || '').substring(0, 60)}`);

  // Check via web API (slug query - what live site uses)
  const webCheck = await req('GET', `/api/digimon?where[slug][equals]=${doc.slug}&limit=1&depth=0`, null, token);
  const webDoc = webCheck.body.docs?.[0];
  console.log(`Slug query: ${webDoc ? 'OK' : 'FAILED'} - intro: ${(webDoc?.introduction || '').substring(0, 60)}`);

  // Restore
  await req('PATCH', `/api/digimon/${doc.id}`, { introduction: origIntro }, token);
  console.log('\nRestored original intro.');

  // Count total
  const count = await req('GET', '/api/digimon?limit=1', null, token);
  console.log(`\nTotal Digimon: ${count.body.totalDocs}`);

  // Check images
  let withIcon = 0, withMain = 0;
  let page = 1;
  while (true) {
    const r = await req('GET', `/api/digimon?limit=100&page=${page}&depth=0`, null, token);
    for (const d of r.body.docs || []) {
      if (d.icon) withIcon++;
      if (d.mainImage) withMain++;
    }
    if (!r.body.hasNextPage) break;
    page++;
  }
  console.log(`With icon: ${withIcon}`);
  console.log(`With mainImage: ${withMain}`);
}

main().catch(e => console.error(e));
