/**
 * CMS Application Logger
 * 
 * Simple structured logging utility for development and production.
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
    if (!this.isDevelopment) return;
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

  // Specialized logging for CMS operations
  
  import(operation: string, digimonName: string, success: boolean, details?: unknown): void {
    const message = `${operation}: ${digimonName}`;
    if (success) {
      this.info(message, 'Import', details);
    } else {
      this.error(message, 'Import', details);
    }
  }

  media(operation: string, filename: string, details?: unknown): void {
    this.debug(`${operation}: ${filename}`, 'Media', details);
  }

  payload(operation: string, collection: string, success: boolean): void {
    const message = `${operation} ${collection}`;
    if (success) {
      this.debug(message, 'Payload');
    } else {
      this.error(message, 'Payload');
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for external use
export type { LogLevel, LogEntry };
