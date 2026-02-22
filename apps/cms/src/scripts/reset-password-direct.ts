import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function resetPassword(email: string, newPassword: string) {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    console.log(`\n🔐 Resetting password for: ${email}\n`);
    
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (${user.role})`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    console.log(`\n✅ Password reset successfully!\n`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`\n🌐 Login at: http://localhost:3001/admin\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

const email = process.argv[2] || 'eski@dmokb.local';
const password = process.argv[3] || 'admin123';

resetPassword(email, password);
