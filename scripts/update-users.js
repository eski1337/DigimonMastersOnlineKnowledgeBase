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
  if (!token) { console.error('Login failed'); process.exit(1); }
  console.log('Logged in');

  // 1. Delete lukas.bohn@icloud.com
  console.log('\n--- Deleting lukas.bohn@icloud.com ---');
  const del = await req('DELETE', '/api/users/699a3fecc479ca6916d80489', null, token);
  console.log('Delete status:', del.status, del.body?.id ? 'OK' : JSON.stringify(del.body).substring(0, 100));

  // 2. Update eski@dmokb.info
  console.log('\n--- Updating eski@dmokb.info ---');
  const update = await req('PATCH', '/api/users/699ca2fc0ba571f29802a6be', {
    username: 'eskiDMO',
    name: 'eskiDMO',
    role: 'owner',
    discordId: '184019339731664898',
  }, token);
  
  if (update.body.doc) {
    const doc = update.body.doc;
    console.log('Updated:', {
      email: doc.email,
      username: doc.username,
      name: doc.name,
      role: doc.role,
      discordId: doc.discordId,
    });
  } else {
    console.log('Update failed:', JSON.stringify(update.body).substring(0, 200));
  }

  // 3. List remaining users
  console.log('\n--- Remaining Users ---');
  const users = await req('GET', '/api/users?limit=50', null, token);
  for (const u of users.body.docs || []) {
    console.log(`  ${u.email.padEnd(35)} role=${(u.role||'?').padEnd(8)} username=${u.username || '?'} name=${u.name || '?'}`);
  }
}

main().catch(e => console.error(e));
