const { MongoClient } = require('mongodb');
const crypto = require('crypto');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017/dmo-kb');
  await client.connect();
  const db = client.db();

  const NEW_PASSWORD = 'DmoKb_Alex2026!';
  const alex = await db.collection('users').findOne({ email: 'alexhang@dmokb.info' });

  // Use verified params: iterations=25000, keylen=512, digest=sha256
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(NEW_PASSWORD, salt, 25000, 512, 'sha256').toString('hex');

  await db.collection('users').updateOne(
    { _id: alex._id },
    { $set: { salt, hash, loginAttempts: 0 }, $unset: { lockUntil: '' } }
  );

  await new Promise(r => setTimeout(r, 500));

  const r1 = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexhang@dmokb.info', password: NEW_PASSWORD }),
  });
  console.log('Email login:', r1.ok ? 'SUCCESS' : 'FAILED');

  const r2 = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexhang', password: NEW_PASSWORD }),
  });
  console.log('Username login:', r2.ok ? 'SUCCESS' : 'FAILED');

  console.log('\nPassword set to:', NEW_PASSWORD);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
