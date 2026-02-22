/**
 * Environment variable utilities and validation
 * Centralizes env reads with defaults and type safety
 */

export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue || '';
}

export function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return parsed;
}

export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Get required environment variables with validation
 */
export function getRequiredEnv() {
  return {
    mongodbUri: getEnv('MONGODB_URI'),
    payloadSecret: getEnv('PAYLOAD_SECRET'),
    nodeEnv: getEnv('NODE_ENV', 'development'),
    cmsUrl: getEnv('NEXT_PUBLIC_CMS_URL', 'http://localhost:3001'),
    appUrl: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  };
}

/**
 * Validated environment object (lazy-loaded to avoid premature evaluation)
 */
export const env = {
  get MONGODB_URI() { return getEnv('MONGODB_URI'); },
  get PAYLOAD_SECRET() { return getEnv('PAYLOAD_SECRET'); },
  get NODE_ENV() { return getEnv('NODE_ENV', 'development'); },
  get CMS_URL() { return getEnv('NEXT_PUBLIC_CMS_URL', 'http://localhost:3001'); },
  get APP_URL() { return getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'); },
  get LOG_LEVEL() { return getEnv('LOG_LEVEL', 'info'); },
};

/**
 * Get CORS/CSRF allowed origins
 */
export function getAllowedOrigins(): string[] {
  const appUrl = getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  const customOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  return [appUrl, ...customOrigins].filter(Boolean);
}

/**
 * Get rate limit configuration
 */
export function getRateLimitConfig() {
  return {
    max: getEnvNumber('RATE_LIMIT_MAX', 100),
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
  };
}

/**
 * Get logging configuration
 */
export function getLogConfig() {
  return {
    level: getEnv('LOG_LEVEL', 'info'),
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
}
