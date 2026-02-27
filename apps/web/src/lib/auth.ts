import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import DiscordProvider from 'next-auth/providers/discord';
// import EmailProvider from 'next-auth/providers/email';
// import { MongoDBAdapter } from '@auth/mongodb-adapter';
import type { UserRole } from '@dmo-kb/shared';
import crypto from 'crypto';
import { getCmsToken } from './cms-token';
// import clientPromise from './mongodb';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

// Discord role ID to website role mapping
// Only include entries where env vars are actually configured
const DISCORD_ROLE_MAPPING: Record<string, UserRole> = {};
if (process.env.DISCORD_OWNER_ROLE_ID) DISCORD_ROLE_MAPPING[process.env.DISCORD_OWNER_ROLE_ID] = 'owner';
if (process.env.DISCORD_ADMIN_ROLE_ID) DISCORD_ROLE_MAPPING[process.env.DISCORD_ADMIN_ROLE_ID] = 'admin';
if (process.env.DISCORD_EDITOR_ROLE_ID) DISCORD_ROLE_MAPPING[process.env.DISCORD_EDITOR_ROLE_ID] = 'editor';
if (process.env.DISCORD_MEMBER_ROLE_ID) DISCORD_ROLE_MAPPING[process.env.DISCORD_MEMBER_ROLE_ID] = 'member';

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
        const loginIdentifier = credentials.email.trim();
        
        // Pass identifier directly to CMS login endpoint.
        // The CMS middleware resolves usernames to emails automatically (case-insensitive).
        const response = await fetch(`${CMS_URL}/api/users/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: loginIdentifier,
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
    const cmsToken = await getCmsToken();
    const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cmsToken) authHeaders['Authorization'] = `JWT ${cmsToken}`;

    // Check if user with this discordId already exists
    const existingRes = await fetch(
      `${CMS_URL}/api/users?where[discordId][equals]=${profile.id}&limit=1`,
      { headers: authHeaders }
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
      { headers: authHeaders }
    );
    
    if (emailRes.ok) {
      const emailData = await emailRes.json();
      if (emailData.docs && emailData.docs.length > 0) {
        const existingUser = emailData.docs[0];
        return { id: existingUser.id, role: existingUser.role || 'member' };
      }
    }

    // Create new user in CMS
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const createRes = await fetch(`${CMS_URL}/api/users`, {
      method: 'POST',
      headers: authHeaders,
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
        (session.user as any).username = token.username;
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
          token.username = (user as any).username;
          token.role = (user as any).role;
          token.roles = [(user as any).role];
        }
        // Discord OAuth - Use CMS user ID + role synced from Discord
        else if (account?.provider === 'discord') {
          token.sub = (user as any).cmsId || user.id;
          token.email = user.email;
          token.name = user.name;
          token.username = (user as any).username;
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
          token.username = (user as any).username;
          token.role = token.role || 'member';
          token.roles = token.roles || ['member'];
        }
        token.roleRefreshedAt = Date.now();
      }

      // Periodically re-fetch role from CMS (every 60 seconds)
      // This ensures admin role changes propagate without requiring re-login
      const ROLE_REFRESH_INTERVAL = 60 * 1000; // 60 seconds
      const lastRefresh = (token.roleRefreshedAt as number) || 0;
      if (token.sub && Date.now() - lastRefresh > ROLE_REFRESH_INTERVAL) {
        try {
          const roleToken = await getCmsToken();
          const roleHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
          if (roleToken) roleHeaders['Authorization'] = `JWT ${roleToken}`;
          const userRes = await fetch(
            `${CMS_URL}/api/users?where[id][equals]=${token.sub}&limit=1&depth=0`,
            { headers: roleHeaders }
          );
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.docs && userData.docs.length > 0) {
              const cmsUser = userData.docs[0];
              const roleMapping: Record<string, UserRole> = {
                'owner': 'owner', 'admin': 'admin', 'editor': 'editor',
                'member': 'member', 'user': 'member', 'guest': 'guest',
              };
              const newRole = roleMapping[cmsUser.role] || 'guest';
              token.role = newRole;
              token.roles = [newRole];
              token.name = cmsUser.name || token.name;
              token.username = cmsUser.username || token.username;
            }
          }
        } catch (error) {
          // Non-critical: keep existing role if CMS is unreachable
        }
        token.roleRefreshedAt = Date.now();
      }

      return token;
    },
  },
};
