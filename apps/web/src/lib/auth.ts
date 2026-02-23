import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import DiscordProvider from 'next-auth/providers/discord';
// import EmailProvider from 'next-auth/providers/email';
// import { MongoDBAdapter } from '@auth/mongodb-adapter';
import type { UserRole } from '@dmo-kb/shared';
// import clientPromise from './mongodb';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

// Discord role ID to website role mapping
const DISCORD_ROLE_MAPPING: Record<string, UserRole> = {
  // Replace these IDs with your actual Discord server role IDs
  [process.env.DISCORD_OWNER_ROLE_ID || 'owner-role-id']: 'owner',
  [process.env.DISCORD_ADMIN_ROLE_ID || 'admin-role-id']: 'admin',
  [process.env.DISCORD_EDITOR_ROLE_ID || 'editor-role-id']: 'editor',
  [process.env.DISCORD_MEMBER_ROLE_ID || 'member-role-id']: 'member',
};

// Function to get highest role from Discord roles
function getHighestRole(discordRoles: string[]): UserRole {
  const roleHierarchy: UserRole[] = ['owner', 'admin', 'editor', 'member', 'guest'];
  
  for (const role of roleHierarchy) {
    const discordRoleId = Object.keys(DISCORD_ROLE_MAPPING).find(
      key => DISCORD_ROLE_MAPPING[key] === role
    );
    if (discordRoleId && discordRoles.includes(discordRoleId)) {
      return role;
    }
  }
  
  return 'member'; // Default role for Discord users
}

const providers = [];

// Payload CMS Credentials Provider
providers.push(
  CredentialsProvider({
    name: 'Payload CMS',
    credentials: {
      email: { label: "Email or Username", type: "text" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      try {
        const loginIdentifier = credentials.email;
        const isEmail = loginIdentifier.includes('@');
        
        // If it's not an email, try to find user by username first
        let email = loginIdentifier;
        if (!isEmail) {
          // Find user by username
          const userResponse = await fetch(`${CMS_URL}/api/users?where[username][equals]=${loginIdentifier}&limit=1`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.docs && userData.docs.length > 0) {
              email = userData.docs[0].email;
            } else {
              return null; // Username not found
            }
          } else {
            return null;
          }
        }
        
        // Authenticate with Payload CMS using email
        const response = await fetch(`${CMS_URL}/api/users/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: credentials.password,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        
        if (data.user) {
          // Map Payload role to our UserRole type
          const roleMapping: Record<string, UserRole> = {
            'owner': 'owner',
            'admin': 'admin',
            'editor': 'editor',
            'member': 'member',  // Direct mapping for CMS 'member' role
            'user': 'member',    // Fallback mapping
            'guest': 'guest',    // Explicit guest mapping
          };

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name || data.user.email,
            role: roleMapping[data.user.role] || 'guest',
          };
        }

        return null;
      } catch (error) {
        console.error('Auth error:', error);
        return null;
      }
    },
  })
);

// Add Discord provider if configured
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  providers.push(
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'identify email guilds guilds.members.read',
        },
      },
    })
  );
}

// Email provider requires database adapter - disabled for JWT-only sessions
// if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
//   providers.push(
//     EmailProvider({
//       server: process.env.EMAIL_SERVER,
//       from: process.env.EMAIL_FROM,
//     })
//   );
// }

// Sync a Discord user to Payload CMS (create or update)
async function syncDiscordUserToCMS(profile: { id: string; email: string; username: string; avatar?: string; global_name?: string }): Promise<{ id: string; role: string } | null> {
  try {
    // Check if user with this discordId already exists
    const existingRes = await fetch(
      `${CMS_URL}/api/users?where[discordId][equals]=${profile.id}&limit=1`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (existingRes.ok) {
      const existingData = await existingRes.json();
      if (existingData.docs && existingData.docs.length > 0) {
        const existingUser = existingData.docs[0];
        return { id: existingUser.id, role: existingUser.role || 'member' };
      }
    }

    // Check if user with this email already exists (link accounts)
    const emailRes = await fetch(
      `${CMS_URL}/api/users?where[email][equals]=${encodeURIComponent(profile.email)}&limit=1`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (emailRes.ok) {
      const emailData = await emailRes.json();
      if (emailData.docs && emailData.docs.length > 0) {
        const existingUser = emailData.docs[0];
        return { id: existingUser.id, role: existingUser.role || 'member' };
      }
    }

    // Create new user in CMS
    const randomPassword = require('crypto').randomBytes(32).toString('hex');
    const createRes = await fetch(`${CMS_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: profile.email,
        password: randomPassword,
        username: profile.username,
        name: profile.global_name || profile.username,
        discordId: profile.id,
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      return { id: created.doc?.id || created.id, role: 'member' };
    }
    
    console.error('Failed to create CMS user for Discord:', await createRes.text());
    return null;
  } catch (error) {
    console.error('Failed to sync Discord user to CMS:', error);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
    newUser: '/auth/welcome',
  },
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async signIn({ user, account, profile }) {
      // Discord OAuth: sync user to Payload CMS
      if (account?.provider === 'discord' && profile) {
        const discordProfile = profile as any;
        if (!discordProfile.email) {
          // Discord account has no email — cannot create CMS user
          return '/auth/error?error=OAuthCallback';
        }
        const cmsUser = await syncDiscordUserToCMS({
          id: discordProfile.id,
          email: discordProfile.email,
          username: discordProfile.username,
          avatar: discordProfile.avatar,
          global_name: discordProfile.global_name,
        });
        if (cmsUser) {
          // Attach CMS user data to the user object for the JWT callback
          (user as any).cmsId = cmsUser.id;
          (user as any).cmsRole = cmsUser.role;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) {
        if (url.includes('callbackUrl')) {
          const params = new URL(url).searchParams;
          const callbackUrl = params.get('callbackUrl');
          if (callbackUrl?.includes('discord')) {
            return `${baseUrl}/auth/welcome?new=true`;
          }
        }
        return url;
      }
      return baseUrl;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role || 'guest';
        session.user.roles = token.roles || ['guest'];
      }
      return session;
    },
    async jwt({ token, user, account, profile: _profile }) {
      if (user) {
        // Credentials provider (Payload CMS) - Role from user object
        if (account?.provider === 'credentials' && (user as any).role) {
          token.sub = user.id;
          token.email = user.email;
          token.name = user.name;
          token.role = (user as any).role;
          token.roles = [(user as any).role];
        }
        // Discord OAuth - Use CMS user ID + role synced from Discord
        else if (account?.provider === 'discord') {
          token.sub = (user as any).cmsId || user.id;
          token.email = user.email;
          token.name = user.name;
          token.role = (user as any).cmsRole || 'member';
          token.roles = [(user as any).cmsRole || 'member'];
          
          // Try to upgrade role based on Discord server roles
          try {
            const guildId = process.env.DISCORD_GUILD_ID;
            if (guildId && account.access_token) {
              const response = await fetch(
                `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
                {
                  headers: {
                    Authorization: `Bearer ${account.access_token}`,
                  },
                }
              );
              
              if (response.ok) {
                const member = await response.json();
                const roles = member.roles || [];
                const highestRole = getHighestRole(roles);
                if (highestRole !== 'member') {
                  token.role = highestRole;
                  token.roles = [highestRole];
                }
              }
            }
          } catch (error) {
            console.error('Failed to fetch Discord roles (non-critical):', error);
          }
        } else {
          token.sub = user.id;
          token.email = user.email;
          token.name = user.name;
          token.role = token.role || 'member';
          token.roles = token.roles || ['member'];
        }
      }
      return token;
    },
  },
};
