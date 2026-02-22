import pino from 'pino';

/**
 * Structured logger for CMS backend
 * Uses pino for high-performance JSON logging
 */

const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: logLevel,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create child logger with context
 */
export function createLogger(context: string) {
  return logger.child({ context });
}

/**
 * Log HTTP request
 */
export function logRequest(method: string, path: string, statusCode: number, duration: number) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger[level]({ method, path, statusCode, duration }, `${method} ${path} ${statusCode}`);
}

/**
 * Log database operation
 */
export function logDatabase(operation: string, collection: string, duration: number, error?: Error) {
  if (error) {
    logger.error({ operation, collection, duration, error: error.message }, 'Database error');
  } else {
    logger.debug({ operation, collection, duration }, 'Database operation');
  }
}

/**
 * Log scraper activity
 */
export function logScraper(action: string, url: string, success: boolean, details?: any) {
  const level = success ? 'info' : 'warn';
  logger[level]({ action, url, success, ...details }, `Scraper: ${action}`);
}
