/**
 * Fix AlexHang's password using direct MongoDB update with Payload's
 * scrypt hashing (same algorithm Payload uses internally).
 */
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmo-kb';
const USER_ID = '699ce7a98159f1adefea9813';
const NEW_PASSWORD = 'DmoKb_Alex2026!';

// Payload uses scrypt with these params
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve({ salt, hash: derivedKey.toString('hex') });
    });
  });
}

const client = new MongoClient(MONGO_URI);
try {
  await client.connect();
  const db = client.db();
  
  // Check current state
  const { ObjectId } = await import('mongodb');
  let user;
  try {
    user = await db.collection('users').findOne({ _id: new ObjectId(USER_ID) });
  } catch {
    // Try string ID
    user = await db.collection('users').findOne({ _id: USER_ID });
  }
  
  if (!user) {
    console.error('User not found in MongoDB');
    process.exit(1);
  }
  
  console.log('Found user:', user.email, user.username);
  console.log('Current hash:', user.hash ? 'exists' : 'MISSING');
  console.log('Current salt:', user.salt ? 'exists' : 'MISSING');
  
  // Generate new hash/salt
  const { salt, hash } = await hashPassword(NEW_PASSWORD);
  console.log('\nNew salt generated:', salt.substring(0, 16) + '...');
  console.log('New hash generated:', hash.substring(0, 16) + '...');
  
  // Update in MongoDB
  const updateResult = await db.collection('users').updateOne(
    { _id: user._id },
    { 
      $set: { 
        salt: salt,
        hash: hash,
        loginAttempts: 0,
      },
      $unset: { lockUntil: '' }
    }
  );
  
  console.log('\nMongoDB update:', updateResult.modifiedCount === 1 ? 'SUCCESS' : 'FAILED');
  
  // Verify the update
  const updated = await db.collection('users').findOne({ _id: user._id });
  console.log('Verified hash:', updated.hash ? 'exists' : 'MISSING');
  console.log('Verified salt:', updated.salt ? 'exists' : 'MISSING');
  
  // Now test login via CMS API
  console.log('\n=== Testing login ===');
  
  // Wait a moment for CMS to pick up changes
  await new Promise(r => setTimeout(r, 500));
  
  const emailLogin = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'AlexHang@dmokb.info', password: NEW_PASSWORD }),
  });
  const emailData = await emailLogin.json();
  console.log('Login with email:', emailLogin.ok ? 'SUCCESS' : 'FAILED', emailLogin.status);
  if (!emailLogin.ok) console.log('  Error:', JSON.stringify(emailData));
  
  const usernameLogin = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexhang', password: NEW_PASSWORD }),
  });
  console.log('Login with username:', usernameLogin.ok ? 'SUCCESS' : 'FAILED', usernameLogin.status);
  
} finally {
  await client.close();
}
