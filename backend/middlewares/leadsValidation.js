// leadsValidation.js - Comprehensive validation middleware for leads operations

const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/db');

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

// Phone number validation regex (international format)
const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{6,19}$/;

// Function to get valid lead statuses from database
const getValidStatuses = async () => {
  try {
    const result = await pool.query(`
      SELECT status_name 
      FROM lead_statuses 
      WHERE is_active = true 
      ORDER BY status_name
    `);
    return result.rows.map(row => row.status_name);
  } catch (error) {
    console.error('❌ Error fetching lead statuses:', error);
    // Fallback to default statuses if database query fails
    return ['Active', 'Contacted', 'Qualified', 'Converted', 'Closed'];
  }
};

// Valid lead statuses (will be populated from database)
let validStatuses = ['Active', 'Contacted', 'Qualified', 'Converted', 'Closed'];

// Initialize valid statuses from database
const initializeValidStatuses = async () => {
  try {
    validStatuses = await getValidStatuses();
    console.log('✅ Lead statuses loaded from database:', validStatuses);
  } catch (error) {
    console.error('❌ Failed to load lead statuses from database:', error);
  }
};

// Initialize on module load
initializeValidStatuses();

// Validation rules for creating leads
const validateCreateLead = [
  // Required fields
  body('customer_name')
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Customer name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF'-]+$/)
    .withMessage('Customer name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeInput),
    
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601({ strict: true })
    .withMessage('Date must be in valid ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      const inputDate = new Date(value);
      const today = new Date();
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      
      if (inputDate < oneYearAgo || inputDate > oneYearFromNow) {
        throw new Error('Date must be within one year of today');
      }
      return true;
    }),

  // Required phone number
  body('phone_number')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be between 7 and 20 characters')
    .matches(phoneRegex)
    .withMessage('Invalid phone number format. Use international format (+1234567890)')
    .customSanitizer(sanitizeInput),
    
  body('agent_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Agent ID must be a positive integer'),
    
  body('agent_name')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2, max: 255 })
    .withMessage('Agent name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF'-]+$/)
    .withMessage('Agent name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeInput),
    
  // Optional price field
  body('price')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .custom((value) => {
      if (value !== undefined && value !== null && value !== '') {
        const price = parseFloat(value);
        if (price > 999999999.99) {
          throw new Error('Price cannot exceed 999,999,999.99');
        }
      }
      return true;
    }),
    
  // Required reference source
  body('reference_source_id')
    .notEmpty()
    .withMessage('Reference source is required')
    .isInt({ min: 1 })
    .withMessage('Reference source ID must be a positive integer'),
    
  // Required operations
  body('operations_id')
    .notEmpty()
    .withMessage('Operations staff assignment is required')
    .isInt({ min: 1 })
    .withMessage('Operations ID must be a positive integer'),
    
  // Contact source (optional, defaults to 'unknown')
  body('contact_source')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['call', 'unknown'])
    .withMessage('Contact source must be either "call" or "unknown"'),
    
  body('status')
    .optional({ nullable: true, checkFalsy: true })
    .custom(async (value) => {
      if (!value) {
        return true;
      }
      try {
        const validStatuses = await getValidStatuses();
        if (!validStatuses.includes(value)) {
          throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
        }
      } catch (error) {
        // If database query fails, fall back to default statuses
        const defaultStatuses = ['Active', 'Contacted', 'Qualified', 'Converted', 'Closed'];
        if (!defaultStatuses.includes(value)) {
          throw new Error(`Status must be one of: ${defaultStatuses.join(', ')}`);
        }
      }
      return true;
    }),
    
  // Cross-field validation
  body().custom((body) => {
    // If agent_id is provided, agent_name should also be provided (and vice versa)
    if ((body.agent_id && !body.agent_name) || (!body.agent_id && body.agent_name)) {
      throw new Error('Both agent_id and agent_name must be provided together, or neither');
    }
    return true;
  })
];

// Validation rules for updating leads
const validateUpdateLead = [
  // ID parameter validation
  param('id')
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer'),
    
  // All fields are optional for updates, but if provided, must be valid
  body('customer_name')
    .optional({ nullable: false, checkFalsy: false })
    .notEmpty()
    .withMessage('Customer name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Customer name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF'-]+$/)
    .withMessage('Customer name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeInput),
    
  body('date')
    .optional({ nullable: false, checkFalsy: false })
    .isISO8601({ strict: true })
    .withMessage('Date must be in valid ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      const inputDate = new Date(value);
      const today = new Date();
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      
      if (inputDate < oneYearAgo || inputDate > oneYearFromNow) {
        throw new Error('Date must be within one year of today');
      }
      return true;
    }),
    
  body('phone_number')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be between 7 and 20 characters')
    .matches(phoneRegex)
    .withMessage('Invalid phone number format. Use international format (+1234567890)')
    .customSanitizer(sanitizeInput),
    
  body('agent_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Agent ID must be a positive integer'),
    
  body('agent_name')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2, max: 255 })
    .withMessage('Agent name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF'-]+$/)
    .withMessage('Agent name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeInput),
    
  body('reference_source_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Reference source ID must be a positive integer'),
    
  body('operations_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Operations ID must be a positive integer'),
    
  // Contact source (optional, defaults to 'unknown')
  body('contact_source')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['call', 'unknown'])
    .withMessage('Contact source must be either "call" or "unknown"'),
    
  body('status')
    .optional({ nullable: false, checkFalsy: false })
    .custom(async (value) => {
      if (value) {
        const validStatuses = await getValidStatuses();
        if (!validStatuses.includes(value)) {
          throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
        }
      }
      return true;
    }),
    
  // Ensure at least one field is being updated
  body().custom((body) => {
    const updatableFields = ['customer_name', 'date', 'phone_number', 'agent_id', 'agent_name', 'reference_source_id', 'operations_id', 'contact_source', 'status'];
    const hasUpdate = updatableFields.some(field => body.hasOwnProperty(field));
    
    if (!hasUpdate) {
      throw new Error('At least one field must be provided for update');
    }
    return true;
  }),
  
  // Cross-field validation for updates
  body().custom((body) => {
    // If agent_id is being updated, agent_name should also be provided (and vice versa)
    if ((body.hasOwnProperty('agent_id') && body.agent_id && !body.agent_name) || 
        (body.hasOwnProperty('agent_name') && body.agent_name && !body.agent_id)) {
      throw new Error('Both agent_id and agent_name must be provided together when updating agent information');
    }
    return true;
  })
];

// Validation for lead ID parameter
const validateLeadId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer')
];

// Validation for agent ID parameter
const validateAgentId = [
  param('agentId')
    .isInt({ min: 1 })
    .withMessage('Agent ID must be a positive integer')
];

// Validation for leads filters (query parameters)
const validateLeadsFilters = [
  query('status')
    .optional()
    .custom(async (value) => {
      if (value && value !== 'All') {
        const validStatuses = await getValidStatuses();
        if (!validStatuses.includes(value)) {
          throw new Error(`Status must be one of: ${[...validStatuses, 'All'].join(', ')}`);
        }
      }
      return true;
    }),
    
  query('agent_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Agent ID must be a positive integer'),
    
  query('reference_source_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Reference source ID must be a positive integer'),
    
  query('date_from')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('Date from must be in valid ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      const inputDate = new Date(value);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      if (inputDate < twoYearsAgo) {
        throw new Error('Date from cannot be more than 2 years ago');
      }
      return true;
    }),
    
  query('date_to')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('Date to must be in valid ISO 8601 format (YYYY-MM-DD)')
    .custom((value, { req }) => {
      const inputDate = new Date(value);
      const today = new Date();
      
      if (inputDate > today) {
        throw new Error('Date to cannot be in the future');
      }
      
      // If date_from is also provided, ensure date_to is after date_from
      if (req.query.date_from) {
        const dateFrom = new Date(req.query.date_from);
        if (inputDate < dateFrom) {
          throw new Error('Date to must be after date from');
        }
      }
      
      return true;
    }),
    
  query('search')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === undefined || value === null || value === '') {
        return true; // Optional, so empty is fine
      }
      if (typeof value !== 'string') {
        throw new Error('Search term must be a string');
      }
      const sanitized = sanitizeInput(value);
      if (sanitized.length < 1 || sanitized.length > 100) {
        throw new Error('Search term must be between 1 and 100 characters');
      }
      if (!/^[a-zA-Z0-9\s\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF@.\-+()]+$/.test(sanitized)) {
        throw new Error('Search term contains invalid characters');
      }
      return true;
    })
];

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    console.log('🚫 Validation errors:', errorMessages);
    
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

// Rate limiting for lead operations (prevent abuse)
const leadsRateLimit = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Simple rate limiting: max 20 operations per minute per IP
  if (!req.app.locals.leadsRateLimit) {
    req.app.locals.leadsRateLimit = {};
  }
  
  if (!req.app.locals.leadsRateLimit[clientIP]) {
    req.app.locals.leadsRateLimit[clientIP] = { count: 0, resetTime: now + 60000 };
  }
  
  // Reset counter if time window has passed
  if (now > req.app.locals.leadsRateLimit[clientIP].resetTime) {
    req.app.locals.leadsRateLimit[clientIP] = { count: 0, resetTime: now + 60000 };
  }
  
  // Check rate limit
  if (req.app.locals.leadsRateLimit[clientIP].count >= 20) {
    return res.status(429).json({
      success: false,
      message: 'Too many lead operations. Please wait before trying again.'
    });
  }
  
  // Increment counter
  req.app.locals.leadsRateLimit[clientIP].count++;
  
  next();
};

// Business logic validation for lead creation
const validateLeadBusinessRules = async (req, res, next) => {
  try {
    const { agent_id, reference_source_id, operations_id } = req.body;
    
    // If agent_id is provided, verify it exists (this would require a database check)
    // For now, we'll add a placeholder for this validation
    if (agent_id) {
      // TODO: Add database check to verify agent exists and is active
      // const agent = await User.findById(agent_id);
      // if (!agent || agent.role !== 'agent') {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Invalid agent ID or agent is not active'
      //   });
      // }
    }
    
    // If reference_source_id is provided, verify it exists
    if (reference_source_id) {
      // TODO: Add database check to verify reference source exists
      // const referenceSource = await ReferenceSource.findById(reference_source_id);
      // if (!referenceSource) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Invalid reference source ID'
      //   });
      // }
    }
    
    // If operations_id is provided, verify it exists and user has operations role
    if (operations_id) {
      // TODO: Add database check to verify operations user exists
      // const operationsUser = await User.findById(operations_id);
      // if (!operationsUser || operationsUser.role !== 'operations') {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Invalid operations user ID'
      //   });
      // }
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in business rules validation:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating business rules'
    });
  }
};

module.exports = {
  validateCreateLead,
  validateUpdateLead,
  validateLeadId,
  validateAgentId,
  validateLeadsFilters,
  handleValidationErrors,
  sanitizeRequestBody,
  leadsRateLimit,
  validateLeadBusinessRules,
  sanitizeInput,
  getValidStatuses,
  initializeValidStatuses,
  validStatuses
};
