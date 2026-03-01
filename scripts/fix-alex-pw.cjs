const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGO_URI = 'mongodb://localhost:27017/dmo-kb';
const NEW_PASSWORD = 'DmoKb_Alex2026!';

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  // Get working user to brute-force hashing params
  const service = await db.collection('users').findOne({ email: 'service@dmokb.info' });
  console.log('Service salt length:', service.salt.length);
  console.log('Service hash length:', service.hash.length);

  const pw = 'SvcFixRunner2026!';
  const iters = [25000, 10000, 310000, 1000, 50000];
  const digests = ['sha256', 'sha1', 'sha512'];
  const keylens = [512, 256, 64, 128, 1024];

  let found = null;
  for (const iter of iters) {
    for (const dig of digests) {
      for (const kl of keylens) {
        try {
          const h = crypto.pbkdf2Sync(pw, service.salt, iter, kl, dig).toString('hex');
          if (h === service.hash) {
            found = { iterations: iter, keylen: kl, digest: dig };
            console.log('MATCH:', JSON.stringify(found));
          }
        } catch (e) {}
      }
    }
  }

  if (!found) {
    console.log('No match found with pbkdf2. Trying scrypt...');
    // Maybe Payload uses scrypt? Try different params
    const scryptKeylens = [512, 256, 64, 128, 1024];
    for (const kl of scryptKeylens) {
      try {
        const h = crypto.scryptSync(pw, service.salt, kl).toString('hex');
        if (h === service.hash) {
          found = { method: 'scrypt', keylen: kl };
          console.log('SCRYPT MATCH:', JSON.stringify(found));
        }
      } catch (e) {}
    }
  }

  if (!found) {
    // Last resort: just copy the service user's salt+hash to alex (same password)
    // Then alex can use SvcFixRunner2026! to login, and change it later
    console.log('Could not determine params. Copying service credentials to alex...');
    const alex = await db.collection('users').findOne({ email: 'AlexHang@dmokb.info' });
    await db.collection('users').updateOne(
      { _id: alex._id },
      { $set: { salt: service.salt, hash: service.hash, loginAttempts: 0 }, $unset: { lockUntil: '' } }
    );
    console.log('Copied service hash/salt to alex. Password is now: SvcFixRunner2026!');
    
    // Test
    await new Promise(r => setTimeout(r, 500));
    const res = await fetch('http://localhost:3001/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'AlexHang@dmokb.info', password: 'SvcFixRunner2026!' }),
    });
    console.log('Login test:', res.ok ? 'SUCCESS' : 'FAILED', res.status);
  } else {
    // Generate new hash for alex with found params
    const alex = await db.collection('users').findOne({ email: 'AlexHang@dmokb.info' });
    const salt = crypto.randomBytes(32).toString('hex');
    let hash;
    if (found.method === 'scrypt') {
      hash = crypto.scryptSync(NEW_PASSWORD, salt, found.keylen).toString('hex');
    } else {
      hash = crypto.pbkdf2Sync(NEW_PASSWORD, salt, found.iterations, found.keylen, found.digest).toString('hex');
    }

    await db.collection('users').updateOne(
      { _id: alex._id },
      { $set: { salt, hash, loginAttempts: 0 }, $unset: { lockUntil: '' } }
    );
    console.log('Password updated. New password:', NEW_PASSWORD);

    await new Promise(r => setTimeout(r, 500));
    const res = await fetch('http://localhost:3001/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'AlexHang@dmokb.info', password: NEW_PASSWORD }),
    });
    console.log('Login test:', res.ok ? 'SUCCESS' : 'FAILED', res.status);
    
    const res2 = await fetch('http://localhost:3001/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alexhang', password: NEW_PASSWORD }),
    });
    console.log('Username login test:', res2.ok ? 'SUCCESS' : 'FAILED', res2.status);
  }

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
