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
  
  console.log('=== Cleanup Test Users ===');
  const testEmails = ['e2etest@test.com', 'regtest99@test.com', 'smtptest@dmokb.info'];
  for (const email of testEmails) {
    const search = await req('GET', `/api/users?where[email][equals]=${encodeURIComponent(email)}&limit=1`, null, token);
    if (search.body.docs && search.body.docs.length > 0) {
      const uid = search.body.docs[0].id;
      await new Promise(r => setTimeout(r, 500));
      const del = await req('DELETE', `/api/users/${uid}`, null, token);
      console.log(`  Deleted ${email}: ${del.status === 200 ? 'OK' : 'FAILED'}`);
    }
  }

  console.log('\n=== Final Verification ===');
  
  // Users
  const users = await req('GET', '/api/users?limit=50', null, token);
  console.log(`\nUsers (${users.body.totalDocs}):`);
  for (const u of users.body.docs || []) {
    console.log(`  ${u.email.padEnd(35)} role=${u.role.padEnd(8)} name=${u.name || '?'}`);
  }

  // Digimon count
  const digi = await req('GET', '/api/digimon?limit=1', null, token);
  console.log(`\nDigimon total: ${digi.body.totalDocs}`);

  // Sample: Digimon with images
  let withIcon = 0, withMain = 0, withSkills = 0, withStats = 0, total = 0;
  let page = 1;
  while (true) {
    const r = await req('GET', `/api/digimon?limit=100&page=${page}&depth=0`, null, token);
    for (const d of r.body.docs || []) {
      total++;
      if (d.icon) withIcon++;
      if (d.mainImage) withMain++;
      if (d.skills && d.skills.length > 0) withSkills++;
      if (d.stats && Object.values(d.stats).some(v => v > 0)) withStats++;
    }
    if (!r.body.hasNextPage) break;
    page++;
  }
  console.log(`  With icon: ${withIcon}/${total}`);
  console.log(`  With mainImage: ${withMain}/${total}`);
  console.log(`  With skills: ${withSkills}/${total}`);
  console.log(`  With stats: ${withStats}/${total}`);

  // Test findByID
  const first = await req('GET', '/api/digimon?limit=1&sort=name', null, token);
  const fId = first.body.docs[0].id;
  const find = await req('GET', `/api/digimon/${fId}`, null, token);
  console.log(`\nfindByID: ${find.body.name ? 'OK' : 'FAILED'} (${find.body.name})`);

  // Test PATCH
  const patch = await req('PATCH', `/api/digimon/${fId}`, {}, token);
  console.log(`PATCH: ${patch.body.doc ? 'OK' : 'FAILED'}`);

  // Media count
  const media = await req('GET', '/api/media?limit=1', null, token);
  console.log(`\nMedia total: ${media.body.totalDocs}`);

  console.log('\n=== All checks complete ===');
}

main().catch(e => console.error(e));
