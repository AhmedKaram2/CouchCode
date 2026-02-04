/**
 * Structured Logger Utility
 * Provides consistent logging with levels, timestamps, and correlation IDs
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

class Logger {
  constructor(options = {}) {
    this.minLevel = LOG_LEVELS[options.level?.toUpperCase()] ?? LOG_LEVELS.INFO;
    this.context = options.context || 'main';
    this.enableTimestamps = options.timestamps !== false;
  }

  /**
   * Format a log message with metadata
   */
  formatMessage(level, message, meta = {}) {
    const parts = [];

    if (this.enableTimestamps) {
      const now = new Date();
      parts.push(now.toLocaleTimeString('en-US', { hour12: false }) + '.' +
        now.getMilliseconds().toString().padStart(3, '0'));
    }

    parts.push(`[${LOG_LEVEL_NAMES[level]}]`);
    parts.push(`[${this.context}]`);

    if (meta.correlationId) {
      parts.push(`[${meta.correlationId}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Sanitize sensitive data from logs
   */
  sanitize(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = ['token', 'password', 'pin', 'secret', 'authorization', 'cookie'];
    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Log at debug level
   */
  debug(message, meta = {}) {
    if (this.minLevel <= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, meta));
      if (meta.data) {
        console.log('  Data:', this.sanitize(meta.data));
      }
    }
  }

  /**
   * Log at info level
   */
  info(message, meta = {}) {
    if (this.minLevel <= LOG_LEVELS.INFO) {
      console.log(this.formatMessage(LOG_LEVELS.INFO, message, meta));
      if (meta.data) {
        console.log('  Data:', this.sanitize(meta.data));
      }
    }
  }

  /**
   * Log at warn level
   */
  warn(message, meta = {}) {
    if (this.minLevel <= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage(LOG_LEVELS.WARN, message, meta));
      if (meta.data) {
        console.warn('  Data:', this.sanitize(meta.data));
      }
    }
  }

  /**
   * Log at error level
   */
  error(message, meta = {}) {
    if (this.minLevel <= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage(LOG_LEVELS.ERROR, message, meta));
      if (meta.error) {
        console.error('  Error:', meta.error.message || meta.error);
        if (meta.error.stack) {
          console.error('  Stack:', meta.error.stack);
        }
      }
      if (meta.data) {
        console.error('  Data:', this.sanitize(meta.data));
      }
    }
  }

  /**
   * Log authentication attempt (with audit trail)
   */
  auth(event, success, meta = {}) {
    const level = success ? LOG_LEVELS.INFO : LOG_LEVELS.WARN;
    const status = success ? 'SUCCESS' : 'FAILED';
    const message = `Auth ${event}: ${status}`;

    if (this.minLevel <= level) {
      const fn = success ? console.log : console.warn;
      fn(this.formatMessage(level, message, meta));
      if (meta.ip) {
        fn(`  IP: ${meta.ip}`);
      }
      if (meta.reason && !success) {
        fn(`  Reason: ${meta.reason}`);
      }
    }
  }

  /**
   * Log security event
   */
  security(event, meta = {}) {
    console.warn(this.formatMessage(LOG_LEVELS.WARN, `SECURITY: ${event}`, meta));
    if (meta.ip) {
      console.warn(`  IP: ${meta.ip}`);
    }
    if (meta.details) {
      console.warn(`  Details: ${meta.details}`);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context) {
    return new Logger({
      level: LOG_LEVEL_NAMES[this.minLevel],
      context: `${this.context}:${context}`,
      timestamps: this.enableTimestamps
    });
  }
}

// Create default logger instances
const mainLogger = new Logger({ context: 'main' });
const serverLogger = new Logger({ context: 'server' });
const authLogger = new Logger({ context: 'auth' });
const ptyLogger = new Logger({ context: 'pty' });

module.exports = {
  Logger,
  LOG_LEVELS,
  mainLogger,
  serverLogger,
  authLogger,
  ptyLogger,
  // Default export for convenience
  default: mainLogger
};
