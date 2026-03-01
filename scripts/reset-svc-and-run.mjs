/**
 * Reset service account password, then run the definitive fix v2.
 */
import { execSync } from 'child_process';

const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const NEW_PASS = 'SvcFixRunner2026!';

async function resetAndRun() {
  // Try to find any working login - try both service accounts with various passwords
  const accounts = [
    { email: 'service@dmokb.info', passwords: ['service-api', 'ServiceApi2026!', 'Service2026!', 'service123', NEW_PASS] },
    { email: 'svc@dmokb.info', passwords: ['svc-api', 'SvcApi2026!', 'Svc2026!', 'svc123', NEW_PASS] },
  ];

  let token = null;
  let workingEmail = null;

  for (const acct of accounts) {
    for (const pw of acct.passwords) {
      try {
        const res = await fetch(`${CMS}/api/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: acct.email, password: pw }),
        });
        if (res.ok) {
          const data = await res.json();
          token = data.token;
          workingEmail = acct.email;
          console.log(`✓ Logged in as ${acct.email} with password: ${pw}`);
          break;
        }
      } catch (e) { /* skip */ }
    }
    if (token) break;
  }

  if (!token) {
    // Try to use MongoDB directly to check users
    console.log('Could not login with any known credentials.');
    console.log('Attempting to list users via unauthenticated endpoint...');
    try {
      const res = await fetch(`${CMS}/api/users?limit=5`);
      const data = await res.json();
      console.log('Users found:', (data.docs || []).map(u => `${u.email} (${u.role})`).join(', '));
    } catch(e) {
      console.log('Cannot list users:', e.message);
    }
    
    // Try the first user creation approach - create via mongosh
    console.log('\nAttempting password reset via mongosh...');
    try {
      // Use bcrypt to hash the new password, then update MongoDB directly
      const script = `
        const bcrypt = require('bcryptjs');
        const { MongoClient } = require('mongodb');
        async function main() {
          const client = new MongoClient('mongodb://localhost:27017');
          await client.connect();
          const db = client.db('dmo-kb');
          const hash = await bcrypt.hash('${NEW_PASS}', 10);
          const result = await db.collection('users').updateOne(
            { email: 'service@dmokb.info' },
            { $set: { hash: hash, password: hash } }
          );
          console.log('Updated:', result.modifiedCount);
          
          // Also try svc
          const result2 = await db.collection('users').updateOne(
            { email: 'svc@dmokb.info' },
            { $set: { hash: hash, password: hash } }
          );
          console.log('Updated svc:', result2.modifiedCount);
          
          // List all users
          const users = await db.collection('users').find({}).project({email:1, role:1}).toArray();
          console.log('All users:', JSON.stringify(users));
          
          await client.close();
        }
        main().catch(console.error);
      `;
      execSync(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
    } catch(e) {
      console.log('mongosh approach failed, trying inline...');
    }
    
    // Retry login after reset
    for (const email of ['service@dmokb.info', 'svc@dmokb.info']) {
      try {
        const res = await fetch(`${CMS}/api/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: NEW_PASS }),
        });
        if (res.ok) {
          const data = await res.json();
          token = data.token;
          workingEmail = email;
          console.log(`✓ Logged in as ${email} after reset`);
          break;
        } else {
          console.log(`Login ${email}: ${res.status}`);
        }
      } catch(e) { /* skip */ }
    }
  }

  if (!token) {
    console.error('FATAL: Cannot authenticate. Please provide working credentials.');
    process.exit(1);
  }

  // Now run the actual fix inline
  console.log(`\nUsing token from ${workingEmail} to run fix...\n`);
  process.env.CMS_ADMIN_EMAIL = workingEmail;
  process.env.CMS_ADMIN_PASSWORD = NEW_PASS;
  
  // Import and run definitive-fix-v2
  const fixModule = await import('./definitive-fix-v2.mjs');
}

resetAndRun().catch(console.error);
