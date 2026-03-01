import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  PAYLOAD_SECRET: z.string().min(32, 'PAYLOAD_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_CMS_URL: z.string().url().optional().default('https://cms.dmokb.info'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('https://dmokb.info'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
      
      console.error('❌ Invalid environment variables:\n' + missingVars);
      console.error('\n💡 Check your .env file and ensure all required variables are set.');
      console.error('   See .env.example for reference.\n');
      
      process.exit(1);
    }
    throw error;
  }
}
