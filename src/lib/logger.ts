/**
 * CareLinkAI Logger Utility
 * 
 * A simple, universal logger that works in both browser and Node.js environments.
 * Features:
 * - Different log levels (debug, info, warn, error)
 * - Timestamps for all logs
 * - Environment-aware (only shows debug in development)
 * - Consistent formatting
 * - Object and multi-parameter support
 */

// Determine if we're in a browser or Node.js environment
const isBrowser = typeof window !== 'undefined';
const isDevelopment = process.env.NODE_ENV === 'development';

// Log level definitions
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ANSI color codes for Node.js console
const colors = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  timestamp: '\x1b[90m' // Gray
};

/**
 * Format timestamp for logs
 * @returns {string} Formatted timestamp [HH:MM:SS.mmm]
 */
function getTimestamp(): string {
  const now = new Date();
  return `[${now.toISOString().split('T')[1].slice(0, -1)}]`;
}

/**
 * Format log arguments into a string
 * @param args - Arguments to format
 * @returns {string} Formatted string
 */
function formatArgs(args: any[]): string {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
}

/**
 * Log a message with the specified level
 * @param level - Log level
 * @param args - Arguments to log
 */
function log(level: LogLevel, ...args: any[]): void {
  // Skip debug logs in production
  if (level === 'debug' && !isDevelopment) {
    return;
  }

  const timestamp = getTimestamp();
  const formattedArgs = formatArgs(args);

  if (isBrowser) {
    // Browser logging with console styling
    const styles: Record<LogLevel | 'timestamp', string> = {
      debug: 'color: #00b3e6',
      info: 'color: #00cc66',
      warn: 'color: #ffcc00',
      error: 'color: #ff3300',
      timestamp: 'color: #888888'
    };

    console[level === 'debug' ? 'log' : level](
      `%c${timestamp} %c[${level.toUpperCase()}]`, 
      styles.timestamp, 
      styles[level], 
      ...args
    );
  } else {
    // Node.js logging with ANSI colors
    const colorCode = colors[level];
    const message = `${colors.timestamp}${timestamp}${colors.reset} ${colorCode}[${level.toUpperCase()}]${colors.reset} ${formattedArgs}`;
    console[level === 'debug' ? 'log' : level](message);
  }
}

/**
 * Logger interface with methods for each log level
 */
export const logger = {
  /**
   * Log debug message (only in development)
   * @param args - Arguments to log
   */
  debug: (...args: any[]): void => log('debug', ...args),

  /**
   * Log informational message
   * @param args - Arguments to log
   */
  info: (...args: any[]): void => log('info', ...args),

  /**
   * Log warning message
   * @param args - Arguments to log
   */
  warn: (...args: any[]): void => log('warn', ...args),

  /**
   * Log error message
   * @param args - Arguments to log
   */
  error: (...args: any[]): void => log('error', ...args),

  /**
   * Log a message with a custom level
   * @param level - Log level
   * @param args - Arguments to log
   */
  log: (level: LogLevel, ...args: any[]): void => log(level, ...args),

  /**
   * Create a scoped logger that prefixes all logs with a scope name
   * @param scope - Scope name to prefix logs with
   * @returns Scoped logger instance
   */
  scope: (scope: string) => ({
    debug: (...args: any[]): void => log('debug', `[${scope}]`, ...args),
    info: (...args: any[]): void => log('info', `[${scope}]`, ...args),
    warn: (...args: any[]): void => log('warn', `[${scope}]`, ...args),
    error: (...args: any[]): void => log('error', `[${scope}]`, ...args),
  })
};

export default logger;
