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
  const login = await req('POST', '/api/users/login', {
    email: 'eski@dmokb.info', password: 'EskiDMOKB2026!'
  });
  const token = JSON.parse(login.body).token;

  const toDelete = [
    'testeditor@dmokb.info',
    'testadmin@dmokb.info', 
    'testmember@dmokb.info',
    'verify99@test.com',
    'e2etest@dmokb.info',
    'testuser2@dmokb.info',
    'testuser@dmokb.info',
  ];

  for (const email of toDelete) {
    const find = await req('GET', '/api/users?where[email][equals]=' + encodeURIComponent(email) + '&limit=1', null, token);
    const data = JSON.parse(find.body);
    if (data.docs && data.docs.length > 0) {
      const id = data.docs[0].id;
      await req('DELETE', '/api/users/' + id, null, token);
      console.log('Deleted:', email);
    }
  }

  // List remaining
  const list = await req('GET', '/api/users?limit=50', null, token);
  const users = JSON.parse(list.body).docs;
  console.log('\nRemaining users:');
  users.forEach(u => console.log(`  ${u.email} (${u.role}) verified=${u._verified}`));
})();
