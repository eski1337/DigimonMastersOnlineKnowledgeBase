// Use Payload CMS API + admin token to delete test users
const http = require('http');

function request(method, path, body, token) {
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
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // Login as owner
  const login = await request('POST', '/api/users/login', {
    email: process.env.CMS_ADMIN_EMAIL, password: process.env.CMS_ADMIN_PASSWORD
  });
  const token = JSON.parse(login.body).token;
  console.log('Token:', !!token);

  // Find test users
  const emails = ['testuser456@web.de', 'testuser@web.de', 'lubo-random@web.de'];
  for (const email of emails) {
    const find = await request('GET', '/api/users?where[email][equals]=' + encodeURIComponent(email) + '&limit=1', null, token);
    const data = JSON.parse(find.body);
    if (data.docs && data.docs.length > 0) {
      const id = data.docs[0].id;
      const del = await request('DELETE', '/api/users/' + id, null, token);
      console.log('Deleted', email, ':', del.status);
    } else {
      console.log('Not found:', email);
    }
  }

  // List remaining users
  const list = await request('GET', '/api/users?limit=20', null, token);
  const users = JSON.parse(list.body).docs;
  console.log('\nRemaining users:');
  users.forEach(u => console.log(' -', u.email, '(' + u.role + ')'));
})();
