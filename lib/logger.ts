/**
 * Logger System for Ribh Platform
 * 
 * Replaces console.log with a proper logging system that:
 * - Disables debug logs in production
 * - Supports different log levels
 * - Can be extended to send logs to external services
 * - Sanitizes sensitive information
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private readonly isDevelopment: boolean;
  private readonly isProduction: boolean;
  private readonly enableLogging: boolean;
  private readonly logLevel: LogLevel;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.enableLogging = process.env.ENABLE_LOGGING === 'true' || this.isDevelopment;
    
    // Set log level based on environment
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    this.logLevel = validLevels.includes(envLogLevel) ? envLogLevel : (this.isDevelopment ? 'debug' : 'info');
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.enableLogging) return false;

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const logLevelIndex = levels.indexOf(level);

    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Sanitize sensitive data from log context
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'authorization',
      'cookie',
      'session',
      'apiKey',
      'apikey',
      'accessToken',
      'refreshToken',
      'jwt',
      'creditCard',
      'cvv',
      'ssn',
      'personalId'
    ];

    const sanitized = { ...context };

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Format log message with timestamp and level
   */
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const levelEmoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }[level];

    return `[${timestamp}] ${levelEmoji} [${level.toUpperCase()}] ${message}`;
  }

  /**
   * Debug logs - only in development
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    
    const sanitized = this.sanitizeContext(context);
    console.debug(this.formatMessage('debug', message), sanitized || '');
  }

  /**
   * Info logs - for general information
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    
    const sanitized = this.sanitizeContext(context);
    console.info(this.formatMessage('info', message), sanitized || '');
  }

  /**
   * Warning logs - for warnings
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    
    const sanitized = this.sanitizeContext(context);
    console.warn(this.formatMessage('warn', message), sanitized || '');
  }

  /**
   * Error logs - for errors (always logged)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    
    const sanitized = this.sanitizeContext(context);
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: this.isDevelopment ? error.stack : undefined
    } : error;

    console.error(
      this.formatMessage('error', message),
      errorDetails || '',
      sanitized || ''
    );

    // In production, you can extend this to send to external logging service
    // Example: sendToSentry(error, context);
  }

  /**
   * Log API request (info level)
   */
  apiRequest(method: string, path: string, context?: LogContext): void {
    this.info(`API ${method} ${path}`, context);
  }

  /**
   * Log API response (info level)
   */
  apiResponse(method: string, path: string, statusCode: number, duration?: number): void {
    const context: LogContext = { statusCode };
    if (duration) context.duration = `${duration}ms`;
    this.info(`API ${method} ${path} - ${statusCode}`, context);
  }

  /**
   * Log database query (debug level)
   */
  dbQuery(operation: string, collection: string, context?: LogContext): void {
    this.debug(`DB ${operation} ${collection}`, context);
  }

  /**
   * Log authentication event (info level)
   */
  auth(event: string, userId?: string, context?: LogContext): void {
    const authContext = { ...context, userId: userId || '[anonymous]' };
    this.info(`Auth: ${event}`, authContext);
  }

  /**
   * Log business logic event (info level)
   */
  business(event: string, context?: LogContext): void {
    this.info(`Business: ${event}`, context);
  }

  /**
   * Log performance metric (debug level)
   */
  performance(metric: string, value: number, unit: string = 'ms'): void {
    this.debug(`Performance: ${metric}`, { value: `${value}${unit}` });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };

/**
 * Helper functions for common logging scenarios
 */

/**
 * Log order creation
 */
export function logOrderCreation(orderId: string, userId: string, total: number): void {
  logger.business('Order Created', {
    orderId,
    userId,
    total
  });
}

/**
 * Log order status change
 */
export function logOrderStatusChange(orderId: string, oldStatus: string, newStatus: string): void {
  logger.business('Order Status Changed', {
    orderId,
    oldStatus,
    newStatus
  });
}

/**
 * Log product approval
 */
export function logProductApproval(productId: string, approvedBy: string): void {
  logger.business('Product Approved', {
    productId,
    approvedBy
  });
}

/**
 * Log user action
 */
export function logUserAction(action: string, userId: string, context?: LogContext): void {
  logger.business(`User Action: ${action}`, {
    userId,
    ...context
  });
}

/**
 * Log cache operation
 */
export function logCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string): void {
  logger.debug(`Cache ${operation}`, { key });
}

/**
 * Log rate limit hit
 */
export function logRateLimit(ip: string, endpoint: string): void {
  logger.warn('Rate Limit Exceeded', {
    ip,
    endpoint
  });
}

