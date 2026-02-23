const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  // Test direct CMS user creation
  console.log('=== Direct CMS registration ===');
  const r1 = await post('http://localhost:3001/api/users', {
    email: 'testuser@dmokb.info',
    password: 'TestPass123!',
    username: 'testuser',
    name: 'Test User',
  });
  console.log('Status:', r1.status);
  console.log('Response:', r1.body.substring(0, 300));

  // Test via web API register route
  console.log('\n=== Web API registration ===');
  const r2 = await post('http://localhost:3000/api/auth/register', {
    email: 'testuser2@dmokb.info',
    password: 'TestPass123!',
    username: 'testuser2',
    name: 'Test User 2',
  });
  console.log('Status:', r2.status);
  console.log('Response:', r2.body.substring(0, 300));
})();
