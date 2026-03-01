const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017/dmo-kb');
  await client.connect();
  const db = client.db();

  // Lowercase the email
  const alex = await db.collection('users').findOne({ email: 'AlexHang@dmokb.info' });
  console.log('Current email:', alex.email);
  
  await db.collection('users').updateOne(
    { _id: alex._id },
    { $set: { email: 'alexhang@dmokb.info' } }
  );
  console.log('Updated email to: alexhang@dmokb.info');

  await new Promise(r => setTimeout(r, 500));

  // Test login with lowercased email
  const r1 = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexhang@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  console.log('Login (lowercase email):', r1.status, r1.ok ? 'SUCCESS' : 'FAILED');

  // Test with original casing
  const r2 = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'AlexHang@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  console.log('Login (original case):', r2.status, r2.ok ? 'SUCCESS' : 'FAILED');

  // Test username
  const r3 = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexhang', password: 'SvcFixRunner2026!' }),
  });
  console.log('Login (username):', r3.status, r3.ok ? 'SUCCESS' : 'FAILED');

  if (!r1.ok && !r2.ok) {
    // Revert email back
    await db.collection('users').updateOne(
      { _id: alex._id },
      { $set: { email: 'AlexHang@dmokb.info' } }
    );
    console.log('Reverted email back to AlexHang@dmokb.info');
  }

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
