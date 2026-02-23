const { MongoClient } = require('mongodb');
const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
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
  // Step 1: Set _verified to true in MongoDB
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('dmo-kb');
  
  const result = await db.collection('users').updateOne(
    { email: 'eski@dmokb.info' },
    { $set: { _verified: true } }
  );
  console.log('Verified updated:', result.modifiedCount);
  
  const user = await db.collection('users').findOne({ email: 'eski@dmokb.info' });
  console.log('User:', user.email, 'role:', user.role, 'verified:', user._verified);
  
  await client.close();
  
  // Step 2: Test login
  console.log('\n=== Testing login ===');
  const loginRes = await post('http://localhost:3001/api/users/login', {
    email: 'eski@dmokb.info',
    password: 'EskiDMOKB2026!',
  });
  console.log('Login status:', loginRes.status);
  const data = JSON.parse(loginRes.body);
  console.log('Success:', !!data.token);
  console.log('Role:', data.user?.role);
})();
