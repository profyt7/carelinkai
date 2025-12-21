/**
 * Structured Logging Utility
 * Centralized logging for server-side events
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogContext {
  userId?: string;
  role?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    const nodeEnv = process.env.NODE_ENV;
    
    // Always log errors and warnings
    if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      return true;
    }
    
    // Log info in production
    if (level === LogLevel.INFO) {
      return true;
    }
    
    // Log debug only in development
    if (level === LogLevel.DEBUG) {
      return nodeEnv === 'development';
    }
    
    return false;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    
    // Sanitize context to remove sensitive data
    const sanitizedContext = this.sanitizeContext(context);
    
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...sanitizedContext,
    });
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sensitive = ['password', 'token', 'secret', 'apiKey', 'ssn', 'creditCard'];
    const sanitized = { ...context };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitive.some(s => lowerKey.includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  error(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatLog(LogLevel.ERROR, message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(LogLevel.WARN, message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatLog(LogLevel.INFO, message, context));
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  // Convenience method for audit logging
  audit(event: string, context: LogContext) {
    this.info(`AUDIT: ${event}`, context);
  }
}

export const logger = new Logger();

// Also export as default for convenience
export default logger;

/**
 * Binds a logger instance to a specific request context
 * Useful for webhook handlers and API routes
 */
export function bindRequestLogger(req: any) {
  const context: LogContext = {
    path: req.url,
    method: req.method,
    userAgent: req.headers?.get?.('user-agent') || undefined,
  };

  return {
    info: (msg: string, meta?: any) => logger.info(msg, { ...context, ...meta }),
    error: (msg: string, meta?: any) => logger.error(msg, { ...context, ...meta }),
    warn: (msg: string, meta?: any) => logger.warn(msg, { ...context, ...meta }),
    debug: (msg: string, meta?: any) => logger.debug(msg, { ...context, ...meta }),
    audit: (event: string, meta?: any) => logger.audit(event, { ...context, ...meta }),
  };
}
