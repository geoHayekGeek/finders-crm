// propertyValidationSimple.js - Simplified validation middleware for property operations

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

// Simplified validation rules for property updates - focus on security
const validatePropertyUpdateSimple = [
  // Essential required fields with XSS protection
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .custom((value) => {
      if (value && (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload='))) {
        return Promise.reject(new Error('Title contains potentially malicious content'));
      }
      return Promise.resolve(true);
    }),
    
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2,000 characters')
    .custom((value) => {
      if (value && (value.includes('<') || value.includes('>') || value.includes('javascript:') || value.includes('onload='))) {
        return Promise.reject(new Error('Description contains potentially malicious content'));
      }
      return Promise.resolve(true);
    }),
    
  // Basic required fields
  body('status_id')
    .notEmpty()
    .withMessage('Status ID is required')
    .isInt({ min: 1 })
    .withMessage('Status ID must be a positive integer'),
    
  body('category_id')
    .notEmpty()
    .withMessage('Category ID is required')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
    
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0.01, max: 1000000000 })
    .withMessage('Price must be between $0.01 and $1,000,000,000'),
    
  body('surface')
    .notEmpty()
    .withMessage('Surface area is required')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Surface area must be between 0.01 and 10,000 m²'),
    
  // Security-critical fields with XSS protection
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
    }),
    
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

module.exports = {
  validatePropertyUpdateSimple,
  handleValidationErrors,
  sanitizeRequestBody,
  sanitizeInput
};



