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

export const authOptions: NextAuthOptions = {
  // Note: MongoDBAdapter disabled for JWT sessions
  // adapter: MongoDBAdapter(clientPromise) as any,
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
    newUser: '/auth/welcome', // Redirect new users to welcome page
  },
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Check if this is after a Discord OAuth callback
      // Discord redirects will have the baseUrl + some path
      if (url.startsWith(baseUrl)) {
        // If coming from Discord callback, redirect to welcome
        if (url.includes('callbackUrl')) {
          const params = new URL(url).searchParams;
          const callbackUrl = params.get('callbackUrl');
          if (callbackUrl?.includes('discord')) {
            return `${baseUrl}/auth/welcome?new=true`;
          }
        }
        return url;
      }
      // For Discord provider, always show welcome
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
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        
        // Credentials provider (Payload CMS) - Role from user object
        if (account?.provider === 'credentials' && (user as any).role) {
          token.role = (user as any).role;
          token.roles = [(user as any).role];
        }
        // Discord OAuth - Assign member role by default
        else if (account?.provider === 'discord') {
          // Default role for all Discord users
          token.role = 'member';
          token.roles = ['member'];
          
          // Try to sync roles from Discord server (optional)
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
                // Only upgrade role if they have a special Discord role
                if (highestRole !== 'member') {
                  token.role = highestRole;
                  token.roles = [highestRole];
                }
              }
            }
          } catch (error) {
            console.error('Failed to fetch Discord roles (non-critical):', error);
            // Keep default member role on error
          }
        } else {
          // Email auth or other providers - Default to member
          token.role = token.role || 'member';
          token.roles = token.roles || ['member'];
        }
      }
      return token;
    },
  },
};
