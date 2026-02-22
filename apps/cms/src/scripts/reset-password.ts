import dotenv from 'dotenv';
import payload from 'payload';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function resetPassword(email: string, newPassword: string) {
  try {
    console.log(`\n🔐 Resetting password for: ${email}\n`);

    // Import config
    const config = (await import('../payload.config')).default;
    
    await payload.init({
      secret: process.env.PAYLOAD_SECRET || 'your-secret-here',
      config,
      local: true,
    });

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
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const user = users.docs[0];
    console.log(`✅ Found user: ${user.email} (${user.role})`);

    // Update password
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        password: newPassword,
      },
    });

    console.log(`\n✅ Password reset successfully!\n`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`\n🌐 Login at: http://localhost:3001/admin\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const email = process.argv[2] || 'eski@dmokb.local';
const password = process.argv[3] || 'admin123';

resetPassword(email, password);
