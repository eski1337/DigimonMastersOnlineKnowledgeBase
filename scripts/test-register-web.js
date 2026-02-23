const http = require('http');

const data = JSON.stringify({
  username: 'pelikanbot1337',
  email: 'lubo-random@web.de',
  password: 'TestPass123!',
  confirmPassword: 'TestPass123!',
  name: 'pelikanbot1337',
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('Web proxy status:', res.statusCode);
    console.log('Web proxy response:', body);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
