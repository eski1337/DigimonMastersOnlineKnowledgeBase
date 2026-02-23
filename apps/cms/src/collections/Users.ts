import { CollectionConfig } from 'payload/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info';

const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    verify: {
      generateEmailSubject: () => 'Verify your DMO Knowledge Base account',
      generateEmailHTML: ({ token, user }) => {
        const verifyURL = `${APP_URL}/verify-email?token=${token}`;
        const username = (user as any).name || (user as any).username || 'Tamer';

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 12px 12px 0 0; padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                DMO Knowledge Base
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #94a3b8;">
                Your Digimon Masters Online Companion
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 22px; color: #f8fafc;">
                Welcome, ${username}!
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #cbd5e1;">
                Thank you for creating an account. Please verify your email address to activate your account and start exploring the database.
              </p>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 32px;">
                    <a href="${verifyURL}"
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; letter-spacing: 0.3px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 32px; font-size: 13px; color: #f97316; word-break: break-all;">
                ${verifyURL}
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 0 0 24px;">

              <!-- Info -->
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Once verified, you can log in at
                <a href="${APP_URL}" style="color: #f97316; text-decoration: none;">dmokb.info</a>.
                Editors and Admins can also access the
                <a href="https://cms.dmokb.info/admin" style="color: #f97316; text-decoration: none;">CMS Admin Panel</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #111111; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #475569;">
                If you didn't create this account, you can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #334155;">
                &copy; ${new Date().getFullYear()} DMO Knowledge Base &mdash; dmokb.info
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
      },
    },
  },
  admin: {
    useAsTitle: 'email',
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        // SECURITY: Guard dev-only auto-upgrade behind explicit flags
        const isDevelopment = process.env.NODE_ENV === 'development';
        const autoElevateEnabled = process.env.DEV_AUTO_ELEVATE === 'true';
        
        if (operation === 'create' && !req.user) {
          // New registrations get 'editor' in dev (if enabled), 'member' in production
          data.role = (isDevelopment && autoElevateEnabled) ? 'editor' : 'member';
          console.log(`[Hook] Setting role to ${data.role} for new user:`, data.email);
        }
        
        // Auto-upgrade existing users to 'editor' only if both flags are true
        if (isDevelopment && autoElevateEnabled && (!data.role || ['guest', 'member'].includes(data.role))) {
          data.role = 'editor';
          console.log('[Hook] Auto-upgraded user to editor (dev mode + DEV_AUTO_ELEVATE=true):', data.email);
        }
        
        // Ensure no user is left without a role
        if (!data.role) {
          data.role = 'member';
          console.log('[Hook] Fixing missing role for user:', data.email);
        }
        
        return data;
      },
    ],
  },
  access: {
    read: () => true,
    create: () => true, // Allow public registration
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return {
        id: {
          equals: user.id,
        },
      };
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      return ['admin', 'owner'].includes(user.role);
    },
    admin: ({ req: { user } }) => {
      if (!user) return false;
      return ['editor', 'admin', 'owner'].includes(user.role);
    },
  },
  fields: [
    {
      name: 'username',
      type: 'text',
      required: false, // Not required - allows existing users to login
      unique: true,
      admin: {
        description: 'Unique username for login (optional)',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            // Auto-generate username from email if not provided
            if (!value && data?.email) {
              return data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: process.env.NODE_ENV === 'development' ? 'editor' : 'member',
      options: [
        { label: 'Guest', value: 'guest' },
        { label: 'Member', value: 'member' },
        { label: 'Editor', value: 'editor' },
        { label: 'Admin', value: 'admin' },
        { label: 'Owner', value: 'owner' },
      ],
      access: {
        create: ({ req: { user } }) => {
          // Public users can only set 'member' role (enforced by hook)
          if (!user) return true;
          // Authenticated admins/owners can set any role
          return ['admin', 'owner'].includes(user.role);
        },
        update: ({ req: { user } }) => {
          if (!user) return false;
          return ['admin', 'owner'].includes(user.role);
        },
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'discordId',
      type: 'text',
    },
  ],
};

export default Users;
