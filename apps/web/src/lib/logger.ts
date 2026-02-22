/**
 * Application Logger
 * 
 * Simple structured logging utility for development and production.
 * In production, consider replacing with Winston, Pino, or similar.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context, data } = entry;
    const contextStr = context ? `[${context}]` : '';
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}${dataStr}`;
  }

  private createEntry(level: LogLevel, message: string, context?: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
    };
  }

  debug(message: string, context?: string, data?: unknown): void {
    if (!this.isDevelopment) return; // Only log debug in development
    const entry = this.createEntry('debug', message, context, data);
    console.debug(this.formatLog(entry));
  }

  info(message: string, context?: string, data?: unknown): void {
    if (this.isTest) return;
    const entry = this.createEntry('info', message, context, data);
    console.info(this.formatLog(entry));
  }

  warn(message: string, context?: string, data?: unknown): void {
    if (this.isTest) return;
    const entry = this.createEntry('warn', message, context, data);
    console.warn(this.formatLog(entry));
  }

  error(message: string, context?: string, error?: Error | unknown): void {
    const entry = this.createEntry('error', message, context, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });
    console.error(this.formatLog(entry));
  }

  // Specialized logging methods
  
  api(method: string, path: string, status: number, duration?: number): void {
    const message = `${method} ${path} ${status}`;
    const data = duration ? { duration: `${duration}ms` } : undefined;
    
    if (status >= 500) {
      this.error(message, 'API', data);
    } else if (status >= 400) {
      this.warn(message, 'API', data);
    } else {
      this.info(message, 'API', data);
    }
  }

  database(operation: string, collection: string, duration?: number): void {
    this.debug(`${operation} on ${collection}`, 'Database', { duration: `${duration}ms` });
  }

  auth(event: string, userId?: string, details?: Record<string, unknown>): void {
    this.info(event, 'Auth', { userId, ...details });
  }

  security(event: string, details: unknown): void {
    this.warn(event, 'Security', details);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for external use
export type { LogLevel, LogEntry };
