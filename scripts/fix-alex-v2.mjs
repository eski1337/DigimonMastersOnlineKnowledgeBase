/**
 * Fix AlexHang's password by examining how Payload stores hashes
 * for a working user, then replicating the same approach.
 */
import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmo-kb';

const client = new MongoClient(MONGO_URI);
try {
  await client.connect();
  const db = client.db();
  
  // Look at the working service account's hash format
  const service = await db.collection('users').findOne({ email: 'service@dmokb.info' });
  if (!service) { console.error('Service user not found'); process.exit(1); }
  
  console.log('=== Service account (working) ===');
  console.log('salt length:', service.salt?.length);
  console.log('salt sample:', service.salt?.substring(0, 40));
  console.log('hash length:', service.hash?.length);
  console.log('hash sample:', service.hash?.substring(0, 40));
  
  const alex = await db.collection('users').findOne({ email: 'AlexHang@dmokb.info' });
  console.log('\n=== AlexHang (broken) ===');
  console.log('salt length:', alex.salt?.length);
  console.log('salt sample:', alex.salt?.substring(0, 40));
  console.log('hash length:', alex.hash?.length);
  console.log('hash sample:', alex.hash?.substring(0, 40));
  
} finally {
  await client.close();
}
