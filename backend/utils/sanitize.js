// utils/sanitize.js
// Shared input sanitization utility to prevent XSS and SQL injection

/**
 * Sanitizes string input to prevent XSS and SQL injection attacks
 * Less aggressive than before - preserves quotes and semicolons for legitimate use cases
 * @param {any} input - The input to sanitize
 * @param {object} options - Sanitization options
 * @param {boolean} options.allowQuotes - Allow single and double quotes (default: true)
 * @param {boolean} options.allowSemicolons - Allow semicolons (default: true)
 * @returns {any} - Sanitized input (non-strings returned as-is)
 */
const sanitizeInput = (input, options = {}) => {
  if (typeof input !== 'string') return input;
  
  const { allowQuotes = true, allowSemicolons = true } = options;
  
  let sanitized = input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers (onclick=, onload=, etc.)
    .replace(/data:text\/html/gi, '') // Remove data:text/html to prevent HTML injection
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/<script/gi, '') // Remove script tags
    .replace(/<\/script>/gi, ''); // Remove closing script tags
  
  // Only remove quotes and semicolons if explicitly requested (for SQL injection prevention in specific contexts)
  if (!allowQuotes) {
    sanitized = sanitized.replace(/['"]/g, '');
  }
  if (!allowSemicolons) {
    sanitized = sanitized.replace(/;/g, '');
  }
  
  return sanitized.trim();
};

/**
 * Sanitizes all string fields in an object recursively
 * @param {object} obj - The object to sanitize
 * @param {object} options - Sanitization options (passed to sanitizeInput)
 * @returns {object} - Sanitized object
 */
const sanitizeObject = (obj, options = {}) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key], options);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key], options);
    } else {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
};

module.exports = {
  sanitizeInput,
  sanitizeObject
};
