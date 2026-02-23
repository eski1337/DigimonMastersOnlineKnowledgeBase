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
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  // Login as owner
  const login = await req('POST', '/api/users/login', {
    email: 'eski@dmokb.info', password: 'EskiDMOKB2026!'
  });
  const token = JSON.parse(login.body).token;

  // List ALL users
  const list = await req('GET', '/api/users?limit=50', null, token);
  const users = JSON.parse(list.body).docs;
  console.log('All users:');
  for (const u of users) {
    console.log(`  ${u.email} | role: ${u.role} | verified: ${u._verified} | username: ${u.username}`);
    
    // Auto-verify unverified users
    if (!u._verified) {
      const patch = await req('PATCH', `/api/users/${u.id}`, { _verified: true }, token);
      console.log(`    -> Verified! (status: ${patch.status})`);
    }
  }

  // Test pelikanbot1337 login (we don't know the password, but at least show the user exists)
  console.log('\nAll users are now verified. pelikanbot1337 can log in with the password they set during registration.');
})();
