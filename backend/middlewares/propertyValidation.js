// propertyValidation.js - Comprehensive validation middleware for property operations

const { body, validationResult } = require('express-validator');

// Input sanitization function to prevent XSS and SQL injection
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/['";]/g, '') // Remove SQL injection characters
    .trim();
};

// Validation rules for property operations (create and update)
const validateProperty = [
  // Required fields validation
    
  body('status_id')
    .notEmpty()
    .withMessage('Status ID is required')
    .isInt({ min: 1 })
    .withMessage('Status ID must be a positive integer'),
    
  body('property_type')
    .notEmpty()
    .withMessage('Property type is required')
    .isIn(['sale', 'rent'])
    .withMessage('Property type must be either "sale" or "rent"'),
    
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ min: 3, max: 500 })
    .withMessage('Location must be between 3 and 500 characters')
    .customSanitizer(sanitizeInput),
    
  body('category_id')
    .notEmpty()
    .withMessage('Category ID is required')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
    
  body('owner_name')
    .notEmpty()
    .withMessage('Owner name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Owner name must be between 2 and 255 characters')
    .customSanitizer(sanitizeInput),
    
  body('phone_number')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be between 7 and 20 characters')
    .matches(/^[\+]?[1-9][\d\s\-\(\)]{6,19}$/)
    .withMessage('Invalid phone number format')
    .customSanitizer(sanitizeInput),
    
  body('surface')
    .notEmpty()
    .withMessage('Surface area is required')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Surface area must be between 0.01 and 10,000 m²'),
    
  body('view_type')
    .notEmpty()
    .withMessage('View type is required')
    .isIn(['open view', 'sea view', 'mountain view', 'no view'])
    .withMessage('View type must be one of: open view, sea view, mountain view, no view'),
    
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0.01, max: 1000000000 })
    .withMessage('Price must be between $0.01 and $1,000,000,000'),
    
  body('concierge')
    .notEmpty()
    .withMessage('Concierge service status is required')
    .custom((value) => {
      if (typeof value === 'boolean') return true;
      if (value === 'true' || value === 'false') return true;
      if (value === true || value === false) return true;
      throw new Error('Concierge must be true or false');
    }),
    
  body('details')
    .notEmpty()
    .withMessage('Property details are required')
    .custom((value) => {
      // Accept either object (structured) or string (legacy)
      if (typeof value === 'object' && value !== null) {
        // Validate structured details object
        const allowedKeys = ['floor_number', 'balcony', 'covered_parking', 'outdoor_parking', 'cave'];
        const keys = Object.keys(value);
        const invalidKeys = keys.filter(key => !allowedKeys.includes(key));
        if (invalidKeys.length > 0) {
          return Promise.reject(new Error(`Invalid detail keys: ${invalidKeys.join(', ')}`));
        }
        return Promise.resolve(true);
      } else if (typeof value === 'string') {
        // Legacy string format - validate length
        if (value.length < 1 || value.length > 2000) {
          return Promise.reject(new Error('Details must be between 1 and 2,000 characters'));
        }
        if (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload=')) {
          return Promise.reject(new Error('Details contain potentially malicious content'));
        }
        return Promise.resolve(true);
      }
      return Promise.reject(new Error('Details must be an object or string'));
    }),
    
  body('interior_details')
    .notEmpty()
    .withMessage('Interior details are required')
    .custom((value) => {
      // Accept either object (structured) or string (legacy)
      if (typeof value === 'object' && value !== null) {
        // Validate structured interior details object
        const allowedKeys = ['living_rooms', 'bedrooms', 'bathrooms', 'maid_room'];
        const keys = Object.keys(value);
        const invalidKeys = keys.filter(key => !allowedKeys.includes(key));
        if (invalidKeys.length > 0) {
          return Promise.reject(new Error(`Invalid interior detail keys: ${invalidKeys.join(', ')}`));
        }
        return Promise.resolve(true);
      } else if (typeof value === 'string') {
        // Legacy string format - validate length
        if (value.length < 1 || value.length > 2000) {
          return Promise.reject(new Error('Interior details must be between 1 and 2,000 characters'));
        }
        if (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload=')) {
          return Promise.reject(new Error('Interior details contain potentially malicious content'));
        }
        return Promise.resolve(true);
      }
      return Promise.reject(new Error('Interior details must be an object or string'));
    }),
    
  // Optional fields validation
  body('building_name')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 255 })
    .withMessage('Building name cannot exceed 255 characters')
    .customSanitizer(sanitizeInput),
    
  body('built_year')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage(`Built year must be between 1800 and ${new Date().getFullYear()}`),
    
  body('agent_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Agent ID must be a positive integer'),
    
  body('notes')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 5000 })
    .withMessage('Notes cannot exceed 5,000 characters')
    .customSanitizer(sanitizeInput),
    
  body('payment_facilities')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (typeof value === 'boolean') return true;
      if (value === 'true' || value === 'false') return true;
      if (value === true || value === false) return true;
      throw new Error('Payment facilities must be true or false');
    }),
    
  body('payment_facilities_specification')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('Payment facilities specification cannot exceed 500 characters')
    .customSanitizer(sanitizeInput),
    
  body('property_url')
    .notEmpty()
    .withMessage('Property URL is required')
    .isString()
    .withMessage('Property URL must be a string')
    .isLength({ min: 1, max: 500 })
    .withMessage('Property URL must not exceed 500 characters')
    .custom((value) => {
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error('Property URL is required');
      }
      // Check if it's a valid URL starting with http:// or https://
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Property URL must start with http:// or https://');
        }
      } catch (e) {
        throw new Error('Property URL must be a valid URL starting with http:// or https://');
      }
      return true;
    })
    .customSanitizer(sanitizeInput),
    
  body('main_image')
    .optional()
    .isString()
    .withMessage('Main image must be a string'),
    
  body('image_gallery')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) {
        return true; // Optional field
      }
      if (!Array.isArray(value)) {
        throw new Error('Image gallery must be an array');
      }
      return true;
    }),
    
  body('referrals')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === null || value === undefined) {
        return true; // Allow null/undefined
      }
      if (Array.isArray(value)) {
        return true; // Allow array
      }
      return false; // Reject other types
    })
    .withMessage('Referrals must be an array or null'),
    
  // Custom validation for referrals if provided
  body('referrals.*.name')
    .optional()
    .custom((value, { req, path }) => {
      // Only validate if referrals array exists
      if (!req.body.referrals || !Array.isArray(req.body.referrals)) {
        return true;
      }
      if (!value || value.trim() === '') {
        throw new Error('Referral name is required');
      }
      if (value.length < 2 || value.length > 255) {
        throw new Error('Referral name must be between 2 and 255 characters');
      }
      return true;
    })
    .customSanitizer(sanitizeInput),
    
  body('referrals.*.type')
    .optional()
    .custom((value, { req }) => {
      if (!req.body.referrals || !Array.isArray(req.body.referrals)) {
        return true;
      }
      if (!value) {
        throw new Error('Referral type is required');
      }
      if (!['employee', 'custom'].includes(value)) {
        throw new Error('Referral type must be either "employee" or "custom"');
      }
      return true;
    }),
    
  body('referrals.*.date')
    .optional()
    .custom((value, { req }) => {
      if (!req.body.referrals || !Array.isArray(req.body.referrals)) {
        return true;
      }
      if (!value) {
        throw new Error('Referral date is required');
      }
      // Basic ISO 8601 check
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!iso8601Regex.test(value) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Referral date must be a valid ISO 8601 date');
      }
      return true;
    }),
    
  body('referrals.*.employee_id')
    .optional()
    .custom((value, { req, path }) => {
      if (!req.body.referrals || !Array.isArray(req.body.referrals)) {
        return true;
      }
      const referralIndex = path.match(/referrals\.(\d+)\.employee_id/)?.[1];
      if (referralIndex !== undefined && req.body.referrals?.[referralIndex]?.type === 'employee') {
        if (!value) {
          throw new Error('Employee ID is required for employee referrals');
        }
        if (!Number.isInteger(Number(value)) || Number(value) < 1) {
          throw new Error('Employee ID must be a positive integer');
        }
      }
      return true;
    }),
];

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

// Sanitize all string inputs in request body
const sanitizeRequestBody = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }
  next();
};

// Rate limiting for property updates (prevent abuse)
const propertyUpdateRateLimit = (req, res, next) => {
  // This would typically use Redis or similar for production
  // For now, we'll implement a simple in-memory rate limit
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Simple rate limiting: max 10 updates per minute per IP
  if (!req.app.locals.rateLimit) {
    req.app.locals.rateLimit = {};
  }
  
  if (!req.app.locals.rateLimit[clientIP]) {
    req.app.locals.rateLimit[clientIP] = { count: 0, resetTime: now + 60000 };
  }
  
  // Reset counter if time window has passed
  if (now > req.app.locals.rateLimit[clientIP].resetTime) {
    req.app.locals.rateLimit[clientIP] = { count: 0, resetTime: now + 60000 };
  }
  
  // Check rate limit
  if (req.app.locals.rateLimit[clientIP].count >= 10) {
    return res.status(429).json({
      success: false,
      message: 'Too many property update requests. Please wait before trying again.'
    });
  }
  
  // Increment counter
  req.app.locals.rateLimit[clientIP].count++;
  
  next();
};

module.exports = {
  validateProperty,
  validatePropertyUpdate: validateProperty, // Backward compatibility alias
  handleValidationErrors,
  sanitizeRequestBody,
  propertyUpdateRateLimit,
  sanitizeInput
};
