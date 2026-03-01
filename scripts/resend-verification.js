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
  if (!token) { console.error('Login failed'); process.exit(1); }

  // Get all users
  const users = await req('GET', '/api/users?limit=100', null, token);
  console.log('Total users:', users.body.totalDocs);

  for (const u of users.body.docs || []) {
    const verified = u._verified;
    console.log(`  ${u.email.padEnd(35)} verified=${verified} role=${u.role}`);
    
    if (!verified) {
      // Resend verification via the custom endpoint
      await new Promise(r => setTimeout(r, 2000)); // delay to avoid rate limiting
      const res = await req('POST', '/api/users/resend-verification', { email: u.email }, token);
      console.log(`    -> Resend: ${res.body.message || JSON.stringify(res.body).substring(0, 100)}`);
    }
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
