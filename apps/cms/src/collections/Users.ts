import { CollectionConfig } from 'payload/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info';

const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 10,
    lockTime: 300000, // 5 minutes (down from default 10)
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
    group: { en: 'System', zhTw: '系統' },
    listSearchableFields: ['email', 'username', 'name'],
    defaultColumns: ['email', 'username', 'name', 'role'],
  },
  defaultSort: 'role',
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
    read: ({ req: { user } }) => {
      if (user && ['admin', 'owner'].includes(user.role)) return true;
      if (user) return true;
      return { profileVisibility: { equals: 'public' } };
    },
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
    // username field is now managed by Payload's loginWithUsername
    // but we keep explicit config for indexing and auto-generation
    {
      name: 'username',
      type: 'text',
      required: false,
      unique: true,
      index: true,
      admin: {
        description: { en: 'Unique username for login', zhTw: '用於登入的唯一使用者名稱' },
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            // Auto-generate username from email if not provided
            if (!value && data?.email) {
              return data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
            }
            // Normalize: lowercase, strip dangerous chars
            if (typeof value === 'string') {
              return value.trim().toLowerCase();
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'name',
      label: { en: 'Name', zhTw: '名稱' },
      type: 'text',
    },
    {
      name: 'role',
      label: { en: 'Role', zhTw: '角色' },
      type: 'select',
      required: true,
      defaultValue: 'member',
      options: [
        { label: { en: 'Guest', zhTw: '訪客' }, value: 'guest' },
        { label: { en: 'Member', zhTw: '成員' }, value: 'member' },
        { label: { en: 'Editor', zhTw: '編輯者' }, value: 'editor' },
        { label: { en: 'Admin', zhTw: '管理員' }, value: 'admin' },
        { label: { en: 'Owner', zhTw: '擁有者' }, value: 'owner' },
      ],
      access: {
        create: ({ req: { user } }) => {
          // Deny role field to unauthenticated registrations (hook enforces 'member')
          if (!user) return false;
          // Only admins/owners can set role on creation
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
      label: { en: 'Avatar', zhTw: '頭像' },
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'discordId',
      type: 'text',
      access: {
        read: ({ req: { user }, id }) => {
          if (!user) return false;
          if (['admin', 'owner'].includes(user.role)) return true;
          return user.id === id;
        },
      },
    },

    /* ═══════════════════════════════════════════════════════════════
       PROFILE — public-facing user profile fields
       ═══════════════════════════════════════════════════════════════ */
    {
      type: 'collapsible',
      label: { en: 'Profile', zhTw: '個人檔案' },
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'banner',
          label: { en: 'Profile Banner', zhTw: '個人檔案橫幅' },
          type: 'upload',
          relationTo: 'media',
          admin: { description: { en: 'Banner image for your profile page (recommended 1200×400)', zhTw: '個人檔案頁面的橫幅圖片（建議 1200×400）' } },
        },
        {
          name: 'bio',
          label: { en: 'Bio', zhTw: '自我介紹' },
          type: 'textarea',
          maxLength: 500,
          admin: { description: { en: 'Tell others about yourself (max 500 chars)', zhTw: '介紹一下自己（最多 500 字）' } },
        },
        {
          name: 'location',
          label: { en: 'Location', zhTw: '所在地' },
          type: 'text',
          maxLength: 100,
          admin: { description: { en: 'Your location (optional)', zhTw: '你的所在地（選填）' } },
        },
        {
          name: 'socialLinks',
          label: { en: 'Social Links', zhTw: '社群連結' },
          type: 'group',
          admin: { description: { en: 'Your social media profiles', zhTw: '你的社群媒體帳號' } },
          fields: [
            { name: 'discord', type: 'text', admin: { width: '50%', description: 'Discord username' } },
            { name: 'twitter', type: 'text', admin: { width: '50%', description: 'Twitter/X handle' } },
            { name: 'youtube', type: 'text', admin: { width: '50%', description: 'YouTube channel URL' } },
            { name: 'twitch', type: 'text', admin: { width: '50%', description: 'Twitch username' } },
            { name: 'website', type: 'text', admin: { width: '50%', description: 'Personal website URL' } },
          ],
        },
        {
          name: 'profileVisibility',
          label: { en: 'Profile Visibility', zhTw: '個人檔案可見度' },
          type: 'select',
          defaultValue: 'public',
          options: [
            { label: { en: 'Public', zhTw: '公開' }, value: 'public' },
            { label: { en: 'Registered Users Only', zhTw: '僅限註冊使用者' }, value: 'registered' },
            { label: { en: 'Private', zhTw: '私人' }, value: 'private' },
          ],
          admin: { description: { en: 'Who can see your profile', zhTw: '誰可以查看你的個人檔案' } },
        },
        {
          name: 'allowMessages',
          label: { en: 'Allow Direct Messages', zhTw: '允許私訊' },
          type: 'select',
          defaultValue: 'everyone',
          options: [
            { label: { en: 'Everyone', zhTw: '所有人' }, value: 'everyone' },
            { label: { en: 'Registered Users', zhTw: '註冊使用者' }, value: 'registered' },
            { label: { en: 'Nobody', zhTw: '無人' }, value: 'nobody' },
          ],
          admin: { description: { en: 'Who can send you direct messages', zhTw: '誰可以傳送私訊給你' } },
        },
        {
          name: 'allowProfileComments',
          label: { en: 'Allow Profile Comments', zhTw: '允許檔案留言' },
          type: 'select',
          defaultValue: 'everyone',
          options: [
            { label: { en: 'Everyone', zhTw: '所有人' }, value: 'everyone' },
            { label: { en: 'Registered Users', zhTw: '註冊使用者' }, value: 'registered' },
            { label: { en: 'Nobody', zhTw: '無人' }, value: 'nobody' },
          ],
          admin: { description: { en: 'Who can comment on your profile wall', zhTw: '誰可以在你的個人檔案留言' } },
        },
        {
          name: 'lastSeen',
          label: { en: 'Last Seen', zhTw: '最後上線' },
          type: 'date',
          admin: { readOnly: true, description: { en: 'Last activity timestamp', zhTw: '最後活動時間戳記' } },
        },
      ],
    },
  ],
};

export default Users;
