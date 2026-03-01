const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017/dmo-kb');
  await client.connect();
  const db = client.db();

  const service = await db.collection('users').findOne({ email: 'service@dmokb.info' });
  const alex = await db.collection('users').findOne({ email: 'AlexHang@dmokb.info' });
  
  console.log('Service _id type:', typeof service._id, service._id);
  console.log('Alex _id type:', typeof alex._id, alex._id);
  console.log('Alex email (exact):', JSON.stringify(alex.email));
  console.log('Alex _verified:', alex._verified);
  console.log('Alex enableAPIKey:', alex.enableAPIKey);
  
  // Copy exact salt+hash from service to alex
  const result = await db.collection('users').updateOne(
    { _id: alex._id },
    { 
      $set: { 
        salt: service.salt, 
        hash: service.hash, 
        loginAttempts: 0,
        _verified: true,
      },
      $unset: { lockUntil: '' }
    }
  );
  console.log('\nCopied service hash/salt to alex. modifiedCount:', result.modifiedCount);
  
  // Verify
  const updated = await db.collection('users').findOne({ _id: alex._id });
  console.log('Alex hash matches service:', updated.hash === service.hash);
  console.log('Alex salt matches service:', updated.salt === service.salt);

  await new Promise(r => setTimeout(r, 1000));

  // Test with service password
  console.log('\n--- Testing login with service password ---');
  const r1 = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'AlexHang@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  const d1 = await r1.json();
  console.log('Email login:', r1.status, r1.ok ? 'SUCCESS' : JSON.stringify(d1));

  // Also test service account to make sure CMS is working
  console.log('\n--- Testing service login (control) ---');
  const r2 = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  console.log('Service login:', r2.status, r2.ok ? 'SUCCESS' : 'FAILED');

  // Test with exact case
  console.log('\n--- Testing lowercase email ---');
  const r3 = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexhang@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  console.log('Lowercase email login:', r3.status, r3.ok ? 'SUCCESS' : 'FAILED');

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
