const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017/dmo-kb');
  await client.connect();
  const db = client.db();

  const service = await db.collection('users').findOne({ email: 'service@dmokb.info' });
  const alex = await db.collection('users').findOne({ email: 'AlexHang@dmokb.info' });

  // Print all keys and their types for both
  const allKeys = new Set([...Object.keys(service), ...Object.keys(alex)]);
  
  console.log('Field comparison:');
  console.log('='.repeat(80));
  for (const key of [...allKeys].sort()) {
    if (key === 'hash' || key === 'salt') {
      console.log(`${key.padEnd(25)} service: [${String(service[key]).length} chars]  alex: [${String(alex[key]).length} chars]`);
      continue;
    }
    const sVal = JSON.stringify(service[key]);
    const aVal = JSON.stringify(alex[key]);
    const marker = sVal !== aVal ? ' <-- DIFFERENT' : '';
    console.log(`${key.padEnd(25)} service: ${(sVal || 'undefined').substring(0, 40).padEnd(42)} alex: ${(aVal || 'undefined').substring(0, 40)}${marker}`);
  }

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
