const http = require('http');

const data = JSON.stringify({
  username: 'testuser456',
  email: 'testuser456@web.de',
  password: 'TestPass123!',
  passwordConfirm: 'TestPass123!',
  name: 'Test User',
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    console.log('Body:', body.substring(0, 500));
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
