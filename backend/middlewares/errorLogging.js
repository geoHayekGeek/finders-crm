// errorLogging.js - Enhanced error logging and security monitoring

const fs = require('fs');
const path = require('path');

// Security event types
const SECURITY_EVENTS = {
  VALIDATION_FAILURE: 'VALIDATION_FAILURE',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  CSRF_VIOLATION: 'CSRF_VIOLATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_INPUT: 'SUSPICIOUS_INPUT'
};

// Log directory
const LOG_DIR = path.join(__dirname, '../logs');
const SECURITY_LOG_FILE = path.join(LOG_DIR, 'security.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'errors.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log security event
const logSecurityEvent = (eventType, details) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    eventType,
    details,
    severity: getEventSeverity(eventType)
  };
  
  const logLine = `[${timestamp}] ${eventType}: ${JSON.stringify(details)}\n`;
  
  fs.appendFileSync(SECURITY_LOG_FILE, logLine);
  
  // Also log to console for immediate visibility
  console.error(`🚨 SECURITY EVENT [${eventType}]:`, details);
  
  // In production, you might want to send alerts here
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service, email, Slack, etc.
    sendSecurityAlert(eventType, details);
  }
};

// Log error with context
const logError = (error, req, context = {}) => {
  const timestamp = new Date().toISOString();
  const errorEntry = {
    timestamp,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || 'anonymous'
    },
    context
  };
  
  const logLine = `[${timestamp}] ERROR: ${JSON.stringify(errorEntry)}\n`;
  
  fs.appendFileSync(ERROR_LOG_FILE, logLine);
  
  // Also log to console
  console.error('❌ ERROR:', errorEntry);
};

// Get event severity level
const getEventSeverity = (eventType) => {
  const severityMap = {
    [SECURITY_EVENTS.SQL_INJECTION_ATTEMPT]: 'CRITICAL',
    [SECURITY_EVENTS.XSS_ATTEMPT]: 'CRITICAL',
    [SECURITY_EVENTS.CSRF_VIOLATION]: 'HIGH',
    [SECURITY_EVENTS.VALIDATION_FAILURE]: 'MEDIUM',
    [SECURITY_EVENTS.RATE_LIMIT_EXCEEDED]: 'MEDIUM',
    [SECURITY_EVENTS.UNAUTHORIZED_ACCESS]: 'HIGH',
    [SECURITY_EVENTS.SUSPICIOUS_INPUT]: 'MEDIUM'
  };
  
  return severityMap[eventType] || 'LOW';
};

// Detect suspicious input patterns
// Note: Order matters - more specific patterns (XSS) should be checked before general ones (SQL)
const detectSuspiciousInput = (input) => {
  const patterns = [
    // XSS patterns - check these first as they're more specific
    { pattern: /<script/i, type: 'XSS_ATTEMPT', description: 'Script tag detected' },
    { pattern: /javascript:/i, type: 'XSS_ATTEMPT', description: 'JavaScript protocol detected' },
    { pattern: /on\w+=/i, type: 'XSS_ATTEMPT', description: 'Event handler detected' },
    { pattern: /<iframe/i, type: 'XSS_ATTEMPT', description: 'Iframe tag detected' },
    
    // Path traversal patterns - check before SQL as it's more specific
    { pattern: /\.\./, type: 'PATH_TRAVERSAL_ATTEMPT', description: 'Path traversal detected' },
    
    // SQL Injection patterns - check these after XSS to avoid false positives
    { pattern: /(union|select|insert|update|delete|drop|create|alter)/i, type: 'SQL_INJECTION_ATTEMPT', description: 'SQL keywords detected' },
    { pattern: /['";]/, type: 'SQL_INJECTION_ATTEMPT', description: 'SQL injection characters detected' },
    
    // Command injection patterns
    { pattern: /[;&|`$]/, type: 'COMMAND_INJECTION_ATTEMPT', description: 'Command injection characters detected' }
  ];
  
  for (const { pattern, type, description } of patterns) {
    if (pattern.test(input)) {
      return { type, description, input: input.substring(0, 100) };
    }
  }
  
  return null;
};

// Enhanced error logging middleware
const errorLoggingMiddleware = (req, res, next) => {
  // Store original send method
  const originalSend = res.send;
  
  // Override send method to capture response data
  res.send = function(data) {
    // Log validation failures
    if (res.statusCode === 400 && data && typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (parsed.errors && Array.isArray(parsed.errors)) {
          logSecurityEvent(SECURITY_EVENTS.VALIDATION_FAILURE, {
            endpoint: req.url,
            method: req.method,
            errors: parsed.errors,
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user?.id || 'anonymous'
          });
        }
      } catch (e) {
        // Not JSON, ignore
      }
    }
    
    // Log CSRF violations
    if (res.statusCode === 403 && data && typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (parsed.message && parsed.message.includes('CSRF')) {
          logSecurityEvent(SECURITY_EVENTS.CSRF_VIOLATION, {
            endpoint: req.url,
            method: req.method,
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user?.id || 'anonymous'
          });
        }
      } catch (e) {
        // Not JSON, ignore
      }
    }
    
    // Log rate limit violations
    if (res.statusCode === 429) {
      logSecurityEvent(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, {
        endpoint: req.url,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id || 'anonymous'
      });
    }
    
    // Call original send method
    return originalSend.call(this, data);
  };
  
  // Check request body for suspicious content
  if (req.body) {
    const bodyString = JSON.stringify(req.body);
    const suspicious = detectSuspiciousInput(bodyString);
    
    if (suspicious) {
      logSecurityEvent(SECURITY_EVENTS.SUSPICIOUS_INPUT, {
        endpoint: req.url,
        method: req.method,
        inputType: suspicious.type,
        description: suspicious.description,
        input: suspicious.input,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id || 'anonymous'
      });
    }
  }
  
  next();
};

// Error handler middleware
const errorHandler = (error, req, res, next) => {
  // Log the error
  logError(error, req, {
    stack: error.stack,
    additionalInfo: 'Unhandled error in error handler'
  });
  
  // Send appropriate response
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.errors || [error.message]
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
};

// Send security alert (placeholder for production)
const sendSecurityAlert = (eventType, details) => {
  // In production, implement:
  // - Email notifications
  // - Slack/Discord webhooks
  // - SMS alerts
  // - Integration with security monitoring tools
  
  console.log(`🚨 SECURITY ALERT: ${eventType} - ${JSON.stringify(details)}`);
};

module.exports = {
  errorLoggingMiddleware,
  errorHandler,
  logSecurityEvent,
  logError,
  detectSuspiciousInput,
  getEventSeverity,
  SECURITY_EVENTS
};


