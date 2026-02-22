import payload from 'payload';
import dotenv from 'dotenv';
import config from '../payload.config';
import { env } from '../utils/env';

dotenv.config();

async function checkUser(email: string) {
  try {
    await payload.init({
      secret: env.PAYLOAD_SECRET,
      config,
      local: true,
    });

    console.log(`\n🔍 Checking user: ${email}\n`);

    const users = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email,
        },
      },
      limit: 1,
    });

    if (!users.docs || users.docs.length === 0) {
      console.log(`❌ User NOT found: ${email}`);
      console.log('\n📋 All users in database:');
      
      const allUsers = await payload.find({
        collection: 'users',
        limit: 100,
      });
      
      allUsers.docs.forEach((u: any) => {
        console.log(`  - ${u.email} (${u.role})`);
      });
    } else {
      const user = users.docs[0];
      console.log(`✅ User FOUND: ${email}\n`);
      console.log('📝 User Details:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Username: ${user.username || '(not set)'}`);
      console.log(`  Name: ${user.name || '(not set)'}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Verified: ${(user as any)._verified ? 'Yes' : 'No'}`);
      console.log(`  Created: ${user.createdAt}`);
      
      if (!user.username) {
        console.log('\n⚠️  Username is missing - will be auto-generated on next login');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const email = process.argv[2] || 'lukas.bohn@icloud.com';
checkUser(email);
