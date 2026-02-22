import { CollectionConfig } from 'payload/types';

const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Email verification enabled
    verify: {
      generateEmailHTML: ({ token }) => {
        return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #f97316; margin-bottom: 10px;">Welcome to DMO Knowledge Base!</h1>
              <p style="color: #999; font-size: 14px;">Please verify your email address to complete registration</p>
            </div>
            
            <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin-bottom: 20px;">Click the button below to verify your email address:</p>
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}"
                   style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);">
                  ✓ Verify Email Address
                </a>
              </div>
            </div>
            
            <div style="background: #1f1f1f; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 3px solid #f97316;">
              <p style="color: #999; font-size: 13px; margin: 0 0 8px 0;">Or copy and paste this link:</p>
              <p style="color: #f97316; font-size: 12px; word-break: break-all; margin: 0;">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
            <p style="color: #666; font-size: 12px; text-align: center;">If you didn't create this account, you can safely ignore this email.</p>
            <p style="color: #555; font-size: 11px; text-align: center; margin-top: 20px;">© ${new Date().getFullYear()} DMO Knowledge Base. All rights reserved.</p>
          </div>
        `;
      },
      generateEmailSubject: () => 'Verify your DMO KB account',
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
