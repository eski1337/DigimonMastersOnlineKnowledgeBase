const http = require('http');
const data = JSON.stringify({ email: 'lubo-random@web.de' });
const opts = {
  hostname: 'localhost', port: 3001,
  path: '/api/users/resend-verification',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
};
const r = http.request(opts, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(res.statusCode, d));
});
r.write(data);
r.end();
