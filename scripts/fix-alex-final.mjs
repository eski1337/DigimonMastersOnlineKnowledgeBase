/**
 * Reset AlexHang's password using Payload's local API.
 * This bootstraps Payload directly so it uses its own hashing.
 */
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmo-kb';
const NEW_PASSWORD = 'DmoKb_Alex2026!';
const USER_EMAIL = 'AlexHang@dmokb.info';

await mongoose.connect(MONGO_URI);
const db = mongoose.connection.db;

// Find the user
const user = await db.collection('users').findOne({ email: USER_EMAIL });
if (!user) { console.error('User not found'); process.exit(1); }
console.log('Found:', user.email, user.username);

// Find a working user to understand the schema
const service = await db.collection('users').findOne({ email: 'service@dmokb.info' });
console.log('Service salt length:', service.salt?.length);
console.log('Service hash length:', service.hash?.length);

// Use mongoose User model with passport-local-mongoose plugin
// The schema has setPassword method from the plugin
const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });

// Try to find passport-local-mongoose and use it
try {
  const plmPath = await import.meta.resolve('passport-local-mongoose');
  console.log('Found passport-local-mongoose at:', plmPath);
} catch {
  console.log('passport-local-mongoose not found as direct dep, trying via payload...');
}

// Alternative approach: use the authenticate method from passport-local-mongoose
// by requiring it through payload's dependency tree
let passportLocalMongoose;
try {
  passportLocalMongoose = (await import('passport-local-mongoose')).default;
} catch {
  // Try finding it in payload's deps
  try {
    const payloadPkg = await import('payload');
    // Payload re-exports or bundles it
  } catch (e2) {
    console.log('Could not import passport-local-mongoose:', e2.message);
  }
}

if (passportLocalMongoose) {
  UserSchema.plugin(passportLocalMongoose, {
    usernameField: 'email',
    saltField: 'salt',
    hashField: 'hash',
  });
  
  const User = mongoose.model('User', UserSchema);
  const userDoc = await User.findById(user._id);
  
  await new Promise((resolve, reject) => {
    userDoc.setPassword(NEW_PASSWORD, (err, updated) => {
      if (err) reject(err);
      else resolve(updated);
    });
  });
  
  await userDoc.save();
  console.log('Password set via passport-local-mongoose');
} else {
  // Manual approach: copy service user's hashing approach
  // Use crypto.pbkdf2 with Payload's exact params
  // Check what payload version uses
  const crypto = await import('crypto');
  
  // Payload v2 uses passport-local-mongoose defaults:
  // iterations: 25000, keylen: 512, digest: 'sha256', encoding: 'hex'
  // BUT it may be different. Let's verify by hashing the known service password
  // and comparing with stored hash.
  
  // Actually, let's just try different iteration counts
  const iterations = [25000, 10000, 310000];
  const digestAlgos = ['sha256', 'sha1', 'sha512'];
  const keylens = [512, 256, 64];
  
  console.log('\nBrute-forcing hashing params against service account...');
  const servicePassword = 'SvcFixRunner2026!';
  
  let foundParams = null;
  
  for (const iter of iterations) {
    for (const dig of digestAlgos) {
      for (const kl of keylens) {
        try {
          const derived = crypto.pbkdf2Sync(servicePassword, service.salt, iter, kl, dig);
          const hexHash = derived.toString('hex');
          if (hexHash === service.hash) {
            foundParams = { iterations: iter, keylen: kl, digest: dig };
            console.log(`FOUND: iterations=${iter}, keylen=${kl}, digest=${dig}`);
            break;
          }
        } catch {}
      }
      if (foundParams) break;
    }
    if (foundParams) break;
  }
  
  if (foundParams) {
    // Generate new hash for Alex
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(NEW_PASSWORD, salt, foundParams.iterations, foundParams.keylen, foundParams.digest).toString('hex');
    
    console.log('New salt length:', salt.length);
    console.log('New hash length:', hash.length);
    
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { salt, hash, loginAttempts: 0 }, $unset: { lockUntil: '' } }
    );
    console.log('Password updated in MongoDB');
  } else {
    console.log('Could not determine hashing params!');
    console.log('Service hash first 20:', service.hash?.substring(0, 20));
    console.log('Service salt:', service.salt);
  }
}

// Test login
await new Promise(r => setTimeout(r, 1000));

const emailRes = await fetch('http://localhost:3001/api/users/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: USER_EMAIL, password: NEW_PASSWORD }),
});
console.log('\nLogin with email:', emailRes.ok ? 'SUCCESS ✓' : 'FAILED ✗', emailRes.status);

const userRes = await fetch('http://localhost:3001/api/users/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'alexhang', password: NEW_PASSWORD }),
});
console.log('Login with username:', userRes.ok ? 'SUCCESS ✓' : 'FAILED ✗', userRes.status);

await mongoose.disconnect();
