import { z } from 'zod';

const envSchema = z.object({
  // Public (exposed to browser)
  NEXT_PUBLIC_APP_URL: z.string().url().default('https://dmokb.info'),
  NEXT_PUBLIC_CMS_URL: z.string().url().default('https://cms.dmokb.info'),
  
  // Server-only (not exposed to browser)
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // Optional OAuth
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  DISCORD_OWNER_ROLE_ID: z.string().optional(),
  DISCORD_ADMIN_ROLE_ID: z.string().optional(),
  DISCORD_EDITOR_ROLE_ID: z.string().optional(),
  DISCORD_MEMBER_ROLE_ID: z.string().optional(),
  DISCORD_GUEST_ROLE_ID: z.string().optional(),
  
  // Email
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // External
  OFFICIAL_SITE_URL: z.string().url().optional(),
  
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  
  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
      
      console.error('❌ Invalid environment variables:\n' + missingVars);
      console.error('\n💡 Check your .env file and ensure all required variables are set.');
      console.error('   See .env.example for reference.\n');
      
      throw new Error('Environment validation failed');
    }
    throw error;
  }
}

// Validate on import in server context
if (typeof window === 'undefined') {
  getEnv();
}
