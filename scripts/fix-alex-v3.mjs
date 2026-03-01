/**
 * Fix AlexHang's password using passport-local-mongoose's pbkdf2 algorithm.
 * Payload CMS v2 uses passport-local-mongoose which uses:
 *   crypto.pbkdf2(password, salt, iterations=25000, keylen=512, digest='sha256')
 *   salt: 32 bytes hex (64 chars)
 *   hash: 512 bytes hex (1024 chars)
 */
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmo-kb';
const NEW_PASSWORD = 'DmoKb_Alex2026!';

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString('hex'); // 64 char hex
    crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      resolve({ salt, hash: derivedKey.toString('hex') }); // 1024 char hex
    });
  });
}

const client = new MongoClient(MONGO_URI);
try {
  await client.connect();
  const db = client.db();
  
  const alex = await db.collection('users').findOne({ email: 'AlexHang@dmokb.info' });
  if (!alex) { console.error('User not found'); process.exit(1); }
  console.log('Found user:', alex.email, alex.username);
  
  const { salt, hash } = await hashPassword(NEW_PASSWORD);
  console.log('salt length:', salt.length, '(expect 64)');
  console.log('hash length:', hash.length, '(expect 1024)');
  
  const result = await db.collection('users').updateOne(
    { _id: alex._id },
    { $set: { salt, hash, loginAttempts: 0 }, $unset: { lockUntil: '' } }
  );
  console.log('Update:', result.modifiedCount === 1 ? 'SUCCESS' : 'FAILED');
  
  // Wait and test
  await new Promise(r => setTimeout(r, 500));
  
  // Test email login
  const emailRes = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'AlexHang@dmokb.info', password: NEW_PASSWORD }),
  });
  console.log('\nLogin with email:', emailRes.ok ? 'SUCCESS ✓' : 'FAILED ✗', emailRes.status);
  
  // Test username login
  const userRes = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexhang', password: NEW_PASSWORD }),
  });
  console.log('Login with username:', userRes.ok ? 'SUCCESS ✓' : 'FAILED ✗', userRes.status);
  
  if (emailRes.ok) {
    console.log('\n✅ Password: DmoKb_Alex2026!');
    console.log('✅ Email login: AlexHang@dmokb.info');
    console.log('✅ Username login: alexhang');
  }
  
} finally {
  await client.close();
}
