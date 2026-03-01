const { MongoClient } = require('mongodb');
const crypto = require('crypto');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017/dmo-kb');
  await client.connect();
  const db = client.db();

  const alex = await db.collection('users').findOne({ email: /alexhang/i });
  if (!alex) { console.log('User not found by email'); process.exit(1); }
  
  console.log('email:', alex.email);
  console.log('username:', alex.username);
  console.log('hash length:', alex.hash?.length);
  console.log('salt length:', alex.salt?.length);
  console.log('_verified:', alex._verified);
  console.log('loginAttempts:', alex.loginAttempts);
  
  // Re-set password with correct params
  const NEW_PASSWORD = 'DmoKb_Alex2026!';
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(NEW_PASSWORD, salt, 25000, 512, 'sha256').toString('hex');
  
  console.log('\nNew salt length:', salt.length);
  console.log('New hash length:', hash.length);
  
  await db.collection('users').updateOne(
    { _id: alex._id },
    { $set: { salt, hash, loginAttempts: 0, email: 'alexhang@dmokb.info', _verified: true }, $unset: { lockUntil: '' } }
  );
  console.log('Password + email reset');
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Test
  const r1 = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexhang@dmokb.info', password: NEW_PASSWORD }),
  });
  console.log('\nEmail login:', r1.ok ? 'SUCCESS' : 'FAILED', r1.status);
  
  const r2 = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexhang', password: NEW_PASSWORD }),
  });
  console.log('Username login:', r2.ok ? 'SUCCESS' : 'FAILED', r2.status);

  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
