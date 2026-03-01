import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const NEW_PASS = 'SvcFixRunner2026!';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmo-kb';

function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  return new Promise((resolve, reject) => {
    // passport-local-mongoose defaults: iterations=25000, keylen=512, digest=sha256
    crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      resolve({ salt, hash: derivedKey.toString('hex') });
    });
  });
}

async function main() {
  const { salt, hash } = await hashPassword(NEW_PASS);
  console.log('Generated pbkdf2 hash, salt length:', salt.length, 'hash length:', hash.length);

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('dmo-kb');

  const result = await db.collection('users').updateOne(
    { email: 'service@dmokb.info' },
    { $set: { salt, hash, loginAttempts: 0 } }
  );
  console.log('Updated service@dmokb.info:', result.modifiedCount);

  await client.close();

  // Verify login
  const loginRes = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: NEW_PASS }),
  });
  if (loginRes.ok) {
    console.log('✓ Login works! Password: ' + NEW_PASS);
  } else {
    const txt = await loginRes.text();
    console.log('Login failed:', loginRes.status, txt.slice(0, 200));
  }
}

main().catch(console.error);
