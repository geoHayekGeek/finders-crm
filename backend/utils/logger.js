// logger.js - Structured logging utility
// Replaces console.log with environment-aware logging

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Sanitize sensitive data from logs
function sanitize(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'jwt', 'csrf'];
  const sanitized = { ...data };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }

  return sanitized;
}

const logger = {
  // Info logs - only in development
  info: (...args) => {
    if (isDevelopment) {
      const sanitized = args.map(arg => 
        typeof arg === 'object' ? sanitize(arg) : arg
      );
      console.log(...sanitized);
    }
  },

  // Error logs - always log, but sanitize sensitive data
  error: (message, error = null) => {
    const logData = {
      message,
      timestamp: new Date().toISOString(),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: isDevelopment ? error.stack : undefined
        }
      })
    };
    
    if (isProduction) {
      // In production, send to monitoring service (e.g., Sentry, DataDog)
      // For now, just log to console but sanitized
      console.error(JSON.stringify(sanitize(logData)));
    } else {
      console.error(logData);
    }
  },

  // Warn logs - always log
  warn: (...args) => {
    const sanitized = args.map(arg => 
      typeof arg === 'object' ? sanitize(arg) : arg
    );
    console.warn(...sanitized);
  },

  // Debug logs - only in development
  debug: (...args) => {
    if (isDevelopment) {
      const sanitized = args.map(arg => 
        typeof arg === 'object' ? sanitize(arg) : arg
      );
      console.debug(...sanitized);
    }
  },

  // Security events - always log (for audit trail)
  security: (event, details = {}) => {
    const logData = {
      type: 'SECURITY',
      event,
      timestamp: new Date().toISOString(),
      ...sanitize(details)
    };
    
    // In production, this should go to a security audit log
    console.log(JSON.stringify(logData));
  }
};

module.exports = logger;
