// Reset service account password via MongoDB + bcrypt (same as Payload uses)
// Run: cd /home/deploy/app/apps/cms && node ../../scripts/reset-svc-pw.js

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs') || require('bcrypt');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dmo-kb';
const NEW_PASSWORD = 'MigrationTemp2026!';

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  const result = await db.collection('users').updateOne(
    { email: 'service@dmokb.info' },
    { $set: { hash, salt: undefined } }
  );

  console.log(`Updated ${result.modifiedCount} user(s)`);
  console.log(`Email: service@dmokb.info`);
  console.log(`Password: ${NEW_PASSWORD}`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
