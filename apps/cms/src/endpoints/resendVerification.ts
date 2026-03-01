import { Endpoint } from 'payload/config';

const resendVerification: Endpoint = {
  path: '/users/resend-verification',
  method: 'post',
  handler: async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
      });
    }

    try {
      // Find user by email
      const users = await req.payload.find({
        collection: 'users',
        where: {
          email: {
            equals: email,
          },
        },
        limit: 1,
      });

      if (!users.docs || users.docs.length === 0) {
        // Don't reveal if email exists or not for security
        return res.status(200).json({
          message: 'If an account with that email exists, a verification email has been sent.',
        });
      }

      const user = users.docs[0];

      // Check if already verified
      if (user._verified) {
        return res.status(400).json({
          message: 'This email is already verified. You can sign in.',
        });
      }

      // Resend verification email using Payload's built-in method
      await req.payload.sendEmail({
        to: email,
        subject: 'Verify your DMO KB account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff;">
            <h1 style="color: #f97316;">Verify Your Email</h1>
            <p>Click the button below to verify your email address:</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info'}/verify-email?token=${user._verificationToken}"
               style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">
              Verify Email Address
            </a>
            <p style="color: #999; font-size: 14px;">Or copy and paste this link:</p>
            <p style="color: #f97316; font-size: 12px; word-break: break-all;">${process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info'}/verify-email?token=${user._verificationToken}</p>
            <hr style="border: 1px solid #333; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });

      console.log('✅ Email sent successfully to:', email);

      return res.status(200).json({
        message: 'Verification email sent successfully!',
      });
    } catch (error: any) {
      console.error('❌ Error resending verification:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Stack:', error.stack);
      return res.status(500).json({
        message: 'Failed to send verification email. Please try again later.',
      });
    }
  },
};

export default resendVerification;
