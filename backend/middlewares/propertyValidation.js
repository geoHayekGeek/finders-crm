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
    .isBoolean()
    .withMessage('Concierge must be true or false'),
    
  body('details')
    .notEmpty()
    .withMessage('Property details are required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Details must be between 10 and 2,000 characters')
    .custom((value) => {
      if (value && (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload='))) {
        return Promise.reject(new Error('Details contain potentially malicious content'));
      }
      return Promise.resolve(true);
    })
    .customSanitizer(sanitizeInput),
    
  body('interior_details')
    .notEmpty()
    .withMessage('Interior details are required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Interior details must be between 10 and 2,000 characters')
    .custom((value) => {
      if (value && (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload='))) {
        return Promise.reject(new Error('Interior details contain potentially malicious content'));
      }
      return Promise.resolve(true);
    })
    .customSanitizer(sanitizeInput),
    
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
    
  body('property_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Property URL must be a valid URL starting with http:// or https://')
    .isLength({ max: 500 })
    .withMessage('Property URL must not exceed 500 characters'),
    
  body('main_image')
    .optional()
    .isString()
    .withMessage('Main image must be a string'),
    
  body('image_gallery')
    .optional()
    .isArray()
    .withMessage('Image gallery must be an array'),
    
  body('referrals')
    .optional()
    .isArray()
    .withMessage('Referrals must be an array'),
    
  // Custom validation for referrals if provided
  body('referrals.*.name')
    .if(body('referrals').exists())
    .notEmpty()
    .withMessage('Referral name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Referral name must be between 2 and 255 characters')
    .customSanitizer(sanitizeInput),
    
  body('referrals.*.type')
    .if(body('referrals').exists())
    .notEmpty()
    .withMessage('Referral type is required')
    .isIn(['employee', 'custom'])
    .withMessage('Referral type must be either "employee" or "custom"'),
    
  body('referrals.*.date')
    .if(body('referrals').exists())
    .notEmpty()
    .withMessage('Referral date is required')
    .isISO8601()
    .withMessage('Referral date must be a valid ISO 8601 date'),
    
  body('referrals.*.employee_id')
    .if(body('referrals').exists())
    .if(body('referrals.*.type').equals('employee'))
    .notEmpty()
    .withMessage('Employee ID is required for employee referrals')
    .isInt({ min: 1 })
    .withMessage('Employee ID must be a positive integer'),
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
