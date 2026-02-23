import { CollectionConfig } from 'payload/types';

const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Email verification disabled until PTR/rDNS is configured for the VPS IP
    // (web.de and other providers reject mail without valid PTR record)
    // Re-enable verify once Strato PTR record points to mail.dmokb.info
    verify: false,
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
